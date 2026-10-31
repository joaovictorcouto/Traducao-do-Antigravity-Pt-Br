/**
 * Extracts official multi-layer .ico resource from Antigravity.exe or icon.png
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findAntigravityPath } = require('../core/patcher');

function extractIcon() {
  const installPath = findAntigravityPath();
  const exePath = path.join(installPath, 'Antigravity.exe');
  const targetIco = path.resolve(__dirname, 'app.ico');

  if (!fs.existsSync(exePath)) {
    throw new Error(`Antigravity.exe não encontrado em: ${exePath}`);
  }

  const psScript = `
Add-Type @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class IconExtractor {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint dwFlags);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeLibrary(IntPtr hModule);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr FindResource(IntPtr hModule, IntPtr lpName, IntPtr lpType);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LoadResource(IntPtr hModule, IntPtr hResInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr LockResource(IntPtr hResData);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SizeofResource(IntPtr hModule, IntPtr hResInfo);

    public const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;
    public const int RT_ICON = 3;
    public const int RT_GROUP_ICON = 14;

    public static byte[] ExtractIconGroup(string exePath, int groupIndex) {
        IntPtr hModule = LoadLibraryEx(exePath, IntPtr.Zero, LOAD_LIBRARY_AS_DATAFILE);
        if (hModule == IntPtr.Zero) return null;

        try {
            IntPtr hResInfo = FindResource(hModule, (IntPtr)groupIndex, (IntPtr)RT_GROUP_ICON);
            if (hResInfo == IntPtr.Zero) return null;

            IntPtr hResData = LoadResource(hModule, hResInfo);
            IntPtr pGrp = LockResource(hResData);
            uint grpSize = SizeofResource(hModule, hResInfo);

            byte[] grpBytes = new byte[grpSize];
            Marshal.Copy(pGrp, grpBytes, 0, (int)grpSize);

            ushort idCount = BitConverter.ToUInt16(grpBytes, 4);

            using (MemoryStream ms = new MemoryStream()) {
                using (BinaryWriter bw = new BinaryWriter(ms)) {
                    bw.Write((ushort)0);
                    bw.Write((ushort)1);
                    bw.Write(idCount);

                    uint offset = 6 + (uint)(idCount * 16);
                    List<byte[]> iconDataList = new List<byte[]>();

                    for (int i = 0; i < idCount; i++) {
                        int entryOffset = 6 + (i * 14);
                        byte bWidth = grpBytes[entryOffset];
                        byte bHeight = grpBytes[entryOffset + 1];
                        byte bColorCount = grpBytes[entryOffset + 2];
                        byte bReserved = grpBytes[entryOffset + 3];
                        ushort wPlanes = BitConverter.ToUInt16(grpBytes, entryOffset + 4);
                        ushort wBitCount = BitConverter.ToUInt16(grpBytes, entryOffset + 6);
                        uint dwBytesInRes = BitConverter.ToUInt32(grpBytes, entryOffset + 8);
                        ushort nID = BitConverter.ToUInt16(grpBytes, entryOffset + 12);

                        IntPtr hIconInfo = FindResource(hModule, (IntPtr)nID, (IntPtr)RT_ICON);
                        IntPtr hIconData = LoadResource(hModule, hIconInfo);
                        IntPtr pIcon = LockResource(hIconData);
                        uint iconSize = SizeofResource(hModule, hIconInfo);

                        byte[] iconBytes = new byte[iconSize];
                        Marshal.Copy(pIcon, iconBytes, 0, (int)iconSize);
                        iconDataList.Add(iconBytes);

                        bw.Write(bWidth);
                        bw.Write(bHeight);
                        bw.Write(bColorCount);
                        bw.Write(bReserved);
                        bw.Write(wPlanes);
                        bw.Write(wBitCount);
                        bw.Write(iconSize);
                        bw.Write(offset);

                        offset += iconSize;
                    }

                    foreach (var bytes in iconDataList) {
                        bw.Write(bytes);
                    }

                    return ms.ToArray();
                }
            }
        } finally {
            FreeLibrary(hModule);
        }
    }
}
"@
$bytes = [IconExtractor]::ExtractIconGroup("${exePath.replace(/\\/g, '\\\\')}", 1)
if ($bytes) { [System.IO.File]::WriteAllBytes("${targetIco.replace(/\\/g, '\\\\')}", $bytes) }
`;

  execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '`"')}"`, { stdio: 'inherit' });
  return targetIco;
}

if (require.main === module) {
  const icoPath = extractIcon();
  console.log('Ícone extraído com sucesso em:', icoPath);
}

module.exports = { extractIcon };
