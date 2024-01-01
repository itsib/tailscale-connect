const DATA = `{"ControlURL":"https://controlplane.tailscale.com","RouteAll":true,"AllowSingleHosts":true,"ExitNodeID":"","ExitNodeIP":"","ExitNodeAllowLANAccess":false,"CorpDNS":true,"RunSSH":false,"RunWebClient":false,"WantRunning":true,"LoggedOut":false,"ShieldsUp":false,"AdvertiseTags":null,"Hostname":"","NotepadURLs":false,"AdvertiseRoutes":null,"NoSNAT":false,"NetfilterMode":2,"OperatorUser":"sergey","AutoUpdate":{"Check":true,"Apply":false},"AppConnector":{"Advertise":false},"PostureChecking":false,"NetfilterKind":"","Config":{"PrivateMachineKey":"privkey:0000000000000000000000000000000000000000000000000000000000000000","PrivateNodeKey":"privkey:0000000000000000000000000000000000000000000000000000000000000000","OldPrivateNodeKey":"privkey:0000000000000000000000000000000000000000000000000000000000000000","Provider":"google","UserProfile":{"ID":8205141071470196,"LoginName":"itsib.su@gmail.com","DisplayName":"СергейКрайнов","ProfilePicURL":"https://lh3.googleusercontent.com/a/ACg8ocKDs1dRXBrb6w5jCuO_ofy5cY3_6EkpK8TCx72PcQoIiWVf=s96-c","Roles":[]},"NetworkLockKey":"nlpriv:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","NodeID":"nYsTpNwY6321CNTRL"}}`;

// const allDataRegex = /(^{(?:.|\s)+)/m;
//
// const [, jsonData] = allDataRegex.exec(DATA) || [];
// if (!jsonData) {
//   throw new Error('No data found');
// }
// /(.*}).*$/
const result = DATA
  .replace(/\s+/g, '')
  .replace(/^[a-zA-Z0-9-;,_:./'\s]+{/, '{')
  .replace(/}[a-zA-Z0-9\s]+?$/, '}');

try {
  console.log(result);
} catch (e) {
  console.error(e);
}