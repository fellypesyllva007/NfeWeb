#!/usr/bin/env python3
"""
Adiciona um build mode experimental Linux-aarch64-MT ao projeto ACBrLibNFeConsoleMT.lpi.

Uso:
  export ACBR_HOME=$HOME/acbr-arm64-lab/ACBr
  python3 lab/acbr-arm64/scripts/03-add-linux-aarch64-buildmode.py

O script faz backup do .lpi antes de alterar.
"""

from __future__ import annotations

import os
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

BUILD_MODE_NAME = "Linux-aarch64-MT"


def fail(message: str) -> None:
    print(f"ERRO: {message}", file=sys.stderr)
    sys.exit(1)


def value_node(tag: str, value: str) -> ET.Element:
    el = ET.Element(tag)
    el.set("Value", value)
    return el


def make_macro_values() -> ET.Element:
    macro_values = ET.Element("MacroValues")
    macro_values.set("Count", "2")

    m1 = ET.SubElement(macro_values, "Macro1")
    m1.set("Name", "ACBrDir")
    m1.set("Value", "$Env(ACBR_HOME)")

    m2 = ET.SubElement(macro_values, "Macro2")
    m2.set("Name", "LCLWidgetType")
    m2.set("Value", "nogui")

    return macro_values


def make_search_paths() -> ET.Element:
    paths = ET.Element("SearchPaths")

    include_files = ET.SubElement(paths, "IncludeFiles")
    include_files.set("Value", "$(ProjOutDir);..\\Comum;$(ACBrDir)\\Fontes\\ACBrComum")

    other_units = ET.SubElement(paths, "OtherUnitFiles")
    other_units.set(
        "Value",
        ";".join(
            [
                "..\\Comum",
                "$(ACBrDir)\\Fontes\\ACBrComum",
                "$(ACBrDir)\\Fontes\\ACBrDFe",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\Comum",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\DANFE",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\DANFE\\NFe\\FPDF",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\DANFE\\NFCe\\EscPos",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\DANFE\\NFCe\\FPDF",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\Base\\Servicos",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\Base",
                "$(ACBrDir)\\Fontes\\ACBrDFe\\ACBrNFe\\PCNNFe",
                "$(ACBrDir)\\Fontes\\PCNComum",
                "$(ACBrDir)\\Fontes\\ACBrDiversos",
                "$(ACBrDir)\\Fontes\\ACBrSerial",
                "$(ACBrDir)\\Fontes\\ACBrOpenSSL",
                "$(ACBrDir)\\Fontes\\ACBrTCP",
                "$(ACBrDir)\\Fontes\\ACBrIntegrador",
                "$(ACBrDir)\\Fontes\\ACBrIntegrador\\pcnVFPe",
                "$(ACBrDir)\\Fontes\\Terceiros\\synalist",
                "$(ACBrDir)\\Fontes\\Terceiros\\FPDF-Pascal",
                "$(ACBrDir)\\Fontes\\Terceiros\\GZIPUtils",
                "$(ACBrDir)\\Fontes\\Terceiros\\FastStringReplace",
                "$(ACBrDir)\\Fontes\\Terceiros\\CodeGear",
                "$(ACBrDir)\\Fontes\\Terceiros\\Ole",
                "$(ACBrDir)\\Fontes\\Terceiros\\DelphiZXingQRCode",
                "$(ACBrDir)\\Fontes\\ACBrLibXML2",
            ]
        ),
    )

    output = ET.SubElement(paths, "UnitOutputDirectory")
    output.set("Value", "lib\\CONSOLE-$(TargetCPU)-$(TargetOS)")

    return paths


def make_build_mode(index: int) -> ET.Element:
    item = ET.Element(f"Item{index}")
    item.set("Name", BUILD_MODE_NAME)

    item.append(make_macro_values())

    compiler = ET.SubElement(item, "CompilerOptions")
    compiler.append(value_node("Version", "11"))
    compiler.append(value_node("PathDelim", "\\"))

    target = ET.SubElement(compiler, "Target")
    filename = ET.SubElement(target, "Filename")
    filename.set("Value", "bin\\Linux\\CONSOLE-MT\\libacbrnfe_arm64")

    compiler.append(make_search_paths())

    code = ET.SubElement(compiler, "CodeGeneration")
    smart = ET.SubElement(code, "SmartLinkUnit")
    smart.set("Value", "True")
    cpu = ET.SubElement(code, "TargetCPU")
    cpu.set("Value", "aarch64")
    os_node = ET.SubElement(code, "TargetOS")
    os_node.set("Value", "linux")
    opt = ET.SubElement(code, "Optimizations")
    level = ET.SubElement(opt, "OptimizationLevel")
    level.set("Value", "3")

    linking = ET.SubElement(compiler, "Linking")
    debugging = ET.SubElement(linking, "Debugging")
    gen_debug = ET.SubElement(debugging, "GenerateDebugInfo")
    gen_debug.set("Value", "False")
    strip = ET.SubElement(debugging, "StripSymbols")
    strip.set("Value", "True")
    link_smart = ET.SubElement(linking, "LinkSmart")
    link_smart.set("Value", "True")
    options = ET.SubElement(linking, "Options")
    executable_type = ET.SubElement(options, "ExecutableType")
    executable_type.set("Value", "Library")

    other = ET.SubElement(compiler, "Other")
    custom = ET.SubElement(other, "CustomOptions")
    custom.set("Value", "-dMT -dNOGUI -dNOREPORT")

    return item


def indent(elem: ET.Element, level: int = 0) -> None:
    # Compatibilidade com Python 3.8+: ET.indent existe; este fallback mantém legibilidade.
    try:
        ET.indent(elem, space="  ")  # type: ignore[attr-defined]
        return
    except AttributeError:
        pass

    i = "\n" + level * "  "
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = i + "  "
        for child in elem:
            indent(child, level + 1)
        if not child.tail or not child.tail.strip():
            child.tail = i
    if level and (not elem.tail or not elem.tail.strip()):
        elem.tail = i


def main() -> None:
    acbr_home = os.environ.get("ACBR_HOME")
    if not acbr_home:
        fail("defina ACBR_HOME apontando para o clone do ACBr")

    project = Path(acbr_home) / "Projetos/ACBrLib/Fontes/NFe/ACBrLibNFeConsoleMT.lpi"
    if not project.exists():
        fail(f"arquivo nao encontrado: {project}")

    backup = project.with_suffix(project.suffix + ".bak")
    if not backup.exists():
        shutil.copy2(project, backup)
        print(f"Backup criado: {backup}")

    tree = ET.parse(project)
    root = tree.getroot()

    build_modes = root.find("./ProjectOptions/BuildModes")
    if build_modes is None:
        fail("nao encontrei ProjectOptions/BuildModes no .lpi")

    for child in list(build_modes):
        if child.attrib.get("Name") == BUILD_MODE_NAME:
            print(f"Build mode {BUILD_MODE_NAME} ja existe. Nenhuma alteracao feita.")
            return

    count = int(build_modes.attrib.get("Count", "0"))
    new_index = count + 1
    build_modes.append(make_build_mode(new_index))
    build_modes.set("Count", str(new_index))

    shared = root.find("./ProjectOptions/BuildModes/SharedMatrixOptions")
    if shared is not None:
        for item in list(shared):
            modes = item.attrib.get("Modes")
            if modes and BUILD_MODE_NAME not in modes:
                item.set("Modes", modes + "," + BUILD_MODE_NAME)

    indent(root)
    tree.write(project, encoding="UTF-8", xml_declaration=True)

    print(f"Build mode {BUILD_MODE_NAME} adicionado em: {project}")


if __name__ == "__main__":
    main()
