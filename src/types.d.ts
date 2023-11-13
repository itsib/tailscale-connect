///<reference path="../node_modules/@types/node/index.d.ts"/>
///<reference path="../node_modules/@girs/gnome-shell/src/index.d.ts"/>
///<reference path="../node_modules/@girs/gjs/gjs.d.ts"/>



declare interface MenuAlignment {
  Left: number;
  Right: number;
  Center: number;
}

declare interface ExtensionMetadata {
  readonly uuid: string;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly ['shell-version']: string[];

  /**
   * This field is the submission version of an extension, incremented and controlled by the GNOME Extensions website.
   * The value MUST be a whole number like 1. It MUST NOT be a semantic version like 1.1 or a string like "1".
   * This field SHOULD NOT be set by extension developers. The GNOME Extensions website will override this field and GNOME Shell
   * may automatically upgrade an extension with a lower version than the GNOME Extensions website.
   */
  readonly version?: string;
  readonly ['gettext-domain']?: string;
  readonly ['settings-schema']?: string;
  /**
   * This field is an array of strings describing the GNOME Shell session modes that the extension supports.
   * Almost all extensions will only use the user session mode, which is the default if this field is not present.
   *
   * user           Extensions that specify this key run during active user sessions. If no other session modes are specified,
   *                the extension will be enabled when the session is unlocked and disabled when it locks.
   * unlock-dialog  Extensions that specify this key are allowed to run, or keep running, on the lock screen.
   * gdm            Extensions that specify this key are allowed to run, or keep running, on the login screen.
   *                This session mode is only available for system extensions that are enabled for the "gdm" user.
   */
  readonly ['session-modes']?: 'user' | 'unlock-dialog' | 'gdm';
  /**
   * This field sets the version visible to users. If not given the version field will be displayed instead.
   * The value MUST be a string that only contains letters, numbers, space and period with a length between 1 and 16
   * characters. It MUST NOT contain only only periods and spaces.
   *
   * A valid version-name will match the regex /^(?!^[. ]+$)[a-zA-Z0-9 .]{1,16}$/.
   */
  readonly ['version-name']?: string;
  /**
   * This field is an object including donation links with these possible keys:
   *
   * buymeacoffee custom github kofi liberapay opencollective patreon paypal
   *
   * Value of each element can be string or array of strings (maximum array length is 3).
   *
   * While custom pointing to the exact value (URL), other keys only including the user handle (for example, "paypal": "john_doe" points to the https://paypal.me/john_doe)
   */
  readonly donations?: string;
}

declare interface TailscaleId {
  ID: number | string;
}

declare interface TailscalePeerBase extends TailscaleId {
  Online: boolean;
  TailscaleIPs: [
    string, // IP v4 (eq. "100.88.234.153/32")
    string, // IP v6 (eq. "fd7a:115c:a1e0:ab12:4843:cd96:6258:ea99/128")
  ];
}

declare interface TailscalePeer extends TailscalePeerBase {
  PublicKey: string;
  HostName: string;
  DNSName: string;
  OS: string;
  UserID: number;
  Tags: string[],
  Addrs: null,
  CurAddr: string;
  Relay: string;
  RxBytes: number;
  TxBytes: number;
  Created: string;
  LastWrite: string;
  LastSeen: string;
  LastHandshake: string;
  ExitNode: boolean;
  ExitNodeOption: boolean;
  Active: boolean;
  InNetworkMap: boolean;
  InMagicSock: boolean;
  InEngine: boolean;
}

declare interface TailscaleSelfPeer extends TailscalePeer {
  CapMap: string[]
}

declare interface TailscaleUser extends TailscaleId {
  LoginName: string; // "itsib.su@gmail.com",
  DisplayName: string;
  ProfilePicURL: string;
  Roles: []

}

declare interface TailscaleBackendState {
  Version: string;
  TUN: boolean;
  BackendState: string;
  AuthURL: string;
  /**
   * v4/v6 IP Addresses
   */
  TailscaleIPs: string[];

  Self: TailscaleSelfPeer;
  // If defined - exit node is used
  ExitNodeStatus?: TailscalePeerBase;

  Health: null;
  MagicDNSSuffix: string;

  CurrentTailnet: {
    Name: string;
    MagicDNSSuffix: string;
    MagicDNSEnabled: boolean;
  }

  CertDomains: string[];

  Peer: Record<string, TailscalePeer>;

  User: Record<string, TailscaleUser>;

  ClientVersion: {
    LatestVersion: string;
  }
}

declare interface Logger {
  debug: (...rest: string[]) => void;
  info: (...rest: string[]) => void;
  warn: (...rest: string[]) => void;
  error: (...rest: string[]) => void;
}

declare type TailscaleState = 'enabled' | 'disabled' | 'connected' | 'loading';

declare type Callback<T extends unknown[]> = (...rest: T) => void;

declare type EventName = 'change-state';

declare interface Tailscale {
  on(eventName: 'change-state', callback: Callback<[TailscaleState]>): void;
  on(eventName: EventName, callback: Callback<unknown[]>): void;
  off(eventName?: EventName, callback?: Callback<unknown[]>): void;
}

declare interface Modules {
  logger: { Logger: Logger };
  tailscale: { Tailscale: Tailscale };
  utils: { MenuAlignment: MenuAlignment };
}

declare interface Extension {
  type: 1 | 2;
  state: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 99;
  path: string;
  error: string | null;
  hasPrefs: boolean;
  hasUpdate: boolean;
  canChange: boolean;
  metadata: ExtensionMetadata;
  imports: { modules: Modules };
}

declare function log(message?: string): void;

declare interface global {
  log: any;
}