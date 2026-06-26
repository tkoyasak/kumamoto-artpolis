{
  description = "kumamoto-artpolis";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
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
      ];

      perSystem =
        { pkgs, ... }:
        {
          # nixfmt for the flake itself; run manually with `nix fmt`.
          treefmt = {
            projectRootFile = "flake.nix";
            programs.nixfmt.enable = true;
          };

          # Formatting, linting, type checking and commit hooks are owned by
          # Vite+ (`vp check` / `vp staged`); see vite.config.ts. gitleaks stays
          # here because the `staged` config invokes it from the dev shell.
          devShells.default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              # bun
              gitleaks
              # nodejs
            ];
          };
        };
    };
}
