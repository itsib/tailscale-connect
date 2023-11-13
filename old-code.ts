
const ICON_NAMES: string[] = ['face-smile-symbolic', 'face-sad-symbolic', 'face-raspberry-symbolic'];
let ICON_INDEX = 0;
function getIconName() {
  const iconName = ICON_NAMES[ICON_INDEX];
  ICON_INDEX++;
  // @ts-ignore
  if (ICON_INDEX >= ICON_NAMES.length) {
    ICON_INDEX = 0;
  }
  return iconName;
}
// Main.notify(_('Whatʼs up, folks?'));