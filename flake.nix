{
  description = "kumamoto-art-polis";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
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
            gitleaks = {
              enable = true;
              entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged";
              pass_filenames = false;
            };
            oxlint = {
              enable = true;
              entry = "${pkgs.oxlint}/bin/oxlint";
              files = "\\.[jt]sx?$";
            };
            treefmt.enable = true;
          };

          devShells.default = pkgs.mkShellNoCC {
            inputsFrom = [ config.pre-commit.devShell ];
            packages = with pkgs; [
              # bun
              gitleaks
              # nodejs
              oxfmt
              oxlint
              typescript-go
              wrangler
            ];
          };
        };
    };
}
