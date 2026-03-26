#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ICON = ROOT / "public" / "TheGreatFilterIcon.png"
BUILD_DIR = ROOT / "build"
LINUX_ICONS_DIR = BUILD_DIR / "icons"
ICONSET_DIR = BUILD_DIR / "icon.iconset"


def ensure_source_icon() -> None:
    if not SOURCE_ICON.exists():
        raise FileNotFoundError(f"Source icon not found: {SOURCE_ICON}")


def generate_base_png(source: Image.Image) -> None:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    base = source.resize((1024, 1024), Image.Resampling.LANCZOS)
    base.save(BUILD_DIR / "icon.png", format="PNG")


def generate_windows_ico(source: Image.Image) -> None:
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icon = source.resize((256, 256), Image.Resampling.LANCZOS)
    icon.save(BUILD_DIR / "icon.ico", sizes=ico_sizes, format="ICO")


def generate_linux_icons(source: Image.Image) -> None:
    linux_sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
    LINUX_ICONS_DIR.mkdir(parents=True, exist_ok=True)

    for size in linux_sizes:
        output = source.resize((size, size), Image.Resampling.LANCZOS)
        output.save(LINUX_ICONS_DIR / f"{size}x{size}.png", format="PNG")


def generate_macos_icns(source: Image.Image) -> None:
    if shutil.which("iconutil") is None:
        print("Skipping .icns generation: 'iconutil' is not available on this machine.")
        return

    iconset_sizes = [16, 32, 64, 128, 256, 512]
    ICONSET_DIR.mkdir(parents=True, exist_ok=True)

    for size in iconset_sizes:
        source.resize((size, size), Image.Resampling.LANCZOS).save(
            ICONSET_DIR / f"icon_{size}x{size}.png", format="PNG"
        )
        source.resize((size * 2, size * 2), Image.Resampling.LANCZOS).save(
            ICONSET_DIR / f"icon_{size}x{size}@2x.png", format="PNG"
        )

    subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(BUILD_DIR / "icon.icns")],
        check=True,
    )
    shutil.rmtree(ICONSET_DIR, ignore_errors=True)


def main() -> None:
    ensure_source_icon()
    with Image.open(SOURCE_ICON) as source:
        source = source.convert("RGBA")
        generate_base_png(source)
        generate_windows_ico(source)
        generate_linux_icons(source)
        generate_macos_icns(source)

    print(f"Generated icons from {SOURCE_ICON} into {BUILD_DIR}")


if __name__ == "__main__":
    main()
