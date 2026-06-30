{
  description = "kumamoto-artpolis";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";

    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-darwin" ];

      imports = [
        inputs.treefmt-nix.flakeModule
        inputs.git-hooks.flakeModule
      ];

      perSystem =
        {
          config,
          pkgs,
          inputs',
          ...
        }:
        {
          treefmt = {
            projectRootFile = "flake.nix";
            programs.nixfmt.enable = true;
            programs.oxfmt.enable = true;
          };

          pre-commit.settings.hooks = {
            treefmt.enable = true;
            oxlint.enable = true;

            # Regenerate content/README.md when any content Markdown changes.
            content-readme = {
              enable = true;
              entry = "bun run content";
              files = "^content/.*\\.md$";
              pass_filenames = false;
            };

            gitleaks = {
              enable = true;
              entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged";
              pass_filenames = false;
            };
          };

          devShells.default = pkgs.mkShellNoCC {
            inputsFrom = [ config.pre-commit.devShell ];
            packages = with pkgs; [
              # bun
              gitleaks
              nil
              # nodejs
              oxfmt
              oxlint
              typescript-go
            ];
          };
        };
    };
}
