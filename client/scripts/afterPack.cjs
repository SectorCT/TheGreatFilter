const path = require('path')
const rcedit = require('rcedit')

/**
 * electron-builder skips embedding win.icon when signAndEditExecutable is false.
 * Apply the same resource edit so qlean.exe shows the app icon.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const { appOutDir, packager } = context
  const exeName = `${packager.appInfo.productFilename}.exe`
  const exePath = path.join(appOutDir, exeName)
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico')

  await rcedit(exePath, { icon: iconPath })
}
