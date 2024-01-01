const { Gio } = imports.gi;
const { Preferences, PeerModel } = imports.libs.preferences;

const decoder = new TextDecoder('utf-8');

describe('Preferences', function () {
  let prefsJson, statusJson, dataProvider;

  beforeAll(() => {
    const [,prefsContent] = Gio.File.new_for_path(`./tests/fixtures/prefs-0.json`).load_contents(null);
    const [,statusContent] = Gio.File.new_for_path(`./tests/fixtures/status-0.json`).load_contents(null);

    prefsJson = decoder.decode(prefsContent);
    statusJson = decoder.decode(statusContent);
  })

  beforeEach(() => {
    dataProvider = jasmine.createSpyObj('DataProvider', {
      connect: 1,
      listen: undefined,
      disconnect: undefined,
      destroy: undefined,
    });

    dataProvider.prefs = prefsJson;
    dataProvider.status = statusJson;
  });

  it('Should be created', function () {
    const preferences = new Preferences(dataProvider);

    expect(preferences).toBeDefined();
    expect(dataProvider.connect).toHaveBeenCalledTimes(2);
    expect(dataProvider.listen).toHaveBeenCalledTimes(1);
  });

  it('Properties should be defined and same as textures', function () {
    dataProvider.connect.and.callFake((event, callback) => {
      callback()
      return 1
    });
    const preferences = new Preferences(dataProvider);

    expect(preferences.loginPageUrl).toBe('https://test.node.com');
    expect(preferences.networkName).toBe('email@gmail.com');
    expect(preferences.domain).toBe('local-domain.net');
    expect(preferences.health).toBe('["Test health message"]');
    expect(preferences.acceptRoutes).toBeFalsy();
    expect(preferences.shieldsUp).toBeTruthy()
    expect(preferences.allowLanAccess).toBeTruthy();
    expect(preferences.exitNode).toBe('nQHfhyY3PC21CNTRL');
  });

  it('Status should be logged out', function () {
    let prefsCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::prefs') {
        prefsCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    dataProvider.prefs = dataProvider.prefs
      .replace(/("LoggedOut"):\s?(:?true|false)/, '$1: false')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}')
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: false')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null');
    prefsCallback();
    expect(preferences.state).toEqual(0);

    dataProvider.prefs = dataProvider.prefs
      .replace(/("LoggedOut"):\s?(:?true|false)/, '$1: true')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}')
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: true')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null');
    prefsCallback();
    expect(preferences.state).toEqual(-1);

    dataProvider.prefs = dataProvider.prefs
      .replace(/("LoggedOut"):\s?(:?true|false)/, '$1: false')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: null')
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: true')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null');
    prefsCallback();
    expect(preferences.state).toEqual(-1);
  });

  it('Status should be connected or disconnected by WantRunning', function () {
    let prefsCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::prefs') {
        prefsCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    // Should be 0
    dataProvider.prefs = dataProvider.prefs
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: false')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}');
    prefsCallback();
    expect(preferences.state).toEqual(0);

    // Should be 1
    dataProvider.prefs = dataProvider.prefs
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: true')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}');
    prefsCallback();
    expect(preferences.state).toEqual(1);
  });

  it('Status should be connected trough exit node', function () {
    let prefsCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::prefs') {
        prefsCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    // Should be 1
    dataProvider.prefs = dataProvider.prefs
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: true')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: null')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}');
    prefsCallback();
    expect(preferences.state).toEqual(1);

    // Should be 2
    dataProvider.prefs = dataProvider.prefs
      .replace(/("WantRunning"):\s?(:?true|false)/, '$1: true')
      .replace(/("ExitNodeID"):\s?(:?"[a-zA-Z0-9]+"|null)/, '$1: "NODE123"')
      .replace(/("Config"):\s?(:?\{}|null)/, '$1: {}');
    prefsCallback();
    expect(preferences.state).toEqual(2);
  });

  describe('PeersListModel', function () {
    it('Peer nodes should be added', function () {
      dataProvider.connect.and.callFake((event, callback) => (callback() || 1));
      const preferences = new Preferences(dataProvider);

      const peersRaw = Object.values(JSON.parse(dataProvider.status).Peer);
      const _node1 = preferences.nodes.find(peersRaw[1].ID);

      expect(preferences.nodes.length).toEqual(4);
      expect(_node1).toBeDefined();
      expect(_node1.domain).toBe('amsterdam.local-domain.net.');
      expect(_node1.name).toBe('amsterdam');
      expect(_node1.os).toBe(peersRaw[1].OS);
      expect(_node1.tags).toBe('tag:exit,tag:home');
      expect(_node1.ipV4).toBe('100.79.101.78');
      expect(_node1.ipV6).toBe('fd7a:115c:a1e0::270f:654e');
      expect(_node1.active).toBeFalsy();
      expect(_node1.online).toBeTruthy();
      expect(_node1.exitActive).toBeFalsy();
      expect(_node1.exitSupport).toBeTruthy();
    });

    it('Peer node should be removed', function () {
      dataProvider.connect.and.callFake((event, callback) => !!(callback() || 1));
      const preferences = new Preferences(dataProvider);

      expect(preferences.nodes.length).toEqual(4);

      preferences.nodes.remove('nVquKqjvxV11CNTRL');
      expect(preferences.nodes.length).toEqual(3);
      expect(preferences.nodes.find('nVquKqjvxV11CNTRL')).toBeNull();

      const nodeToRemoved = preferences.nodes.at(2)
      preferences.nodes.length = 2
      expect(preferences.nodes.length).toEqual(2);
      expect(preferences.nodes.find(nodeToRemoved.id)).toBeNull();
    });

    it('Peer node should be replaced', function () {
      let statusCallback;
      dataProvider.connect.and.callFake((event, callback) => {
        if (event === 'notify::status') {
          statusCallback = callback;
        }
        callback();
        return 1
      });
      const preferences = new Preferences(dataProvider);
      preferences.nodes.connect('items-changed', (_list, position, removed, added) => {
        expect(removed).toEqual(4);
        expect(added).toEqual(2);
      });

      const peersRaw = Object.values(JSON.parse(dataProvider.status).Peer);

      const peers = [
        {...peersRaw[0], Online: !peersRaw[0].Online},
        {...peersRaw[1], ExitNode: !peersRaw[1].ExitNode},
      ]
      preferences.nodes.put(peers);

      expect(preferences.nodes.length).toEqual(2);
    });

    it('PeerModel should changed by put method', function () {
      let statusCallback;
      const onChange = jasmine.createSpy()
      dataProvider.connect.and.callFake((event, callback) => {
        if (event === 'notify::status') {
          statusCallback = callback;
        }
        callback();
        return 1
      });
      const preferences = new Preferences(dataProvider);
      preferences.nodes.connect('items-changed', onChange);

      const parsed = JSON.parse(dataProvider.status);

      preferences.nodes.put(Object.values(parsed.Peer));

      expect(preferences.nodes.length).toEqual(4);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Just one peer node should not replaced', function () {
      const onChange = jasmine.createSpy()
      dataProvider.connect.and.callFake((event, callback) => (callback() || 1));
      const preferences = new Preferences(dataProvider);
      preferences.nodes.connect('items-changed', onChange);

      const peersRaw = Object.values(JSON.parse(dataProvider.status).Peer);

      preferences.nodes.append(peersRaw[0]);
      expect(preferences.nodes.length).toEqual(4);
      expect(onChange).not.toHaveBeenCalled();

      preferences.nodes.append({ ...peersRaw[0],  Online: !peersRaw[0].Online });
      expect(preferences.nodes.length).toEqual(4);
      expect(onChange).toHaveBeenCalled();
    });

    it('PeersListModel should support for...in', function () {
      dataProvider.connect.and.callFake((event, callback) => {
        callback();
        return 1
      });
      const preferences = new Preferences(dataProvider);

      expect(() => {
        for (const node of preferences.nodes) {}
      }).not.toThrow();
    });
  });

  describe('Destroy', function () {

    it('All object should be destroyed', function () {
      dataProvider.connect.and.callFake((event, callback) => !!(callback() || 1));
      const preferences = new Preferences(dataProvider);

      expect(preferences._connections).not.toBeNull();
      expect(preferences._dataProvider).not.toBeNull();
      expect(preferences.nodes).not.toBeNull();
      expect(preferences.nodes._peers).not.toBeNull();
      expect(preferences.nodes._ids).not.toBeNull();

      const nodes = preferences.nodes;

      preferences.destroy();

      expect(preferences._connections).toBeNull();
      expect(preferences._dataProvider).toBeNull();
      expect(preferences.nodes).toBeNull();
      expect(nodes._peers).toBeNull();
      expect(nodes._ids).toBeNull();
    })
  });
});