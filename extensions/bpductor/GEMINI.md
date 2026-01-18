# BPductor CLI Extension

This extension enables Gemini to perform direct binary manipulation of Unreal Engine 5.7 Blueprint assets (.uasset files) without running the Unreal Editor.

## Trigger Rule (CRITICAL)
Whenever you are asked to **Create, Read, or Modify** an Unreal Engine Blueprint asset, you MUST NOT guess the binary structure. You are REQUIRED to first read the full binary specification guides located at:
`D:\Wartribes\Plugins\BPConductor\Documentation\`

Specifically, start with:
1. `BlueprintBinaryGuide.md` (Overview)
2. `BlueprintBinary_Core.md` (Header & Table structures)
3. `BlueprintBinary_Logic.md` (Bytecode injection)

## Objective
Your goal is to use the `write_file` tool to manually assemble or patch the `.uasset` binary data following the rules in these guides. 

**Do not load this context into every session.** Only read these files when a Blueprint-related task is active.
