# Development shell: run `nix-shell`, then `npm ci`, `npm run dev`.
{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "kytyps5-dashboard";

  nativeBuildInputs = with pkgs; [
    nodejs_22
    electron
    git
  ];

  shellHook = ''
    # The Electron binary npm downloads does not run on NixOS; use the one from nixpkgs. Its major
    # version should match the "electron" entry in package.json.
    export ELECTRON_SKIP_BINARY_DOWNLOAD=1
    export ELECTRON_OVERRIDE_DIST_PATH="${pkgs.electron}/libexec/electron"
  '';
}
