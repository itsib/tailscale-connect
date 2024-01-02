/**
 * @module
 * @ignore
 */
const { Gio } = imports.gi;
const { Preferences, PeerModel } = imports.libs.preferences;
const { extractJson, extractPrefs, extractNetwork, extractHealth, extractNodes } = imports.libs.utils;

const decoder = new TextDecoder('utf-8');

describe('src/libs/preferences.js', function () {
  let prefsJson, statusJson, dataProvider;

  beforeAll(() => {
    const [,prefsContent] = Gio.File.new_for_path(`./tests/fixtures/prefs-0.json`).load_contents(null);
    const [,statusContent] = Gio.File.new_for_path(`./tests/fixtures/status-0.json`).load_contents(null);

    prefsJson = decoder.decode(prefsContent);
    statusJson = decoder.decode(statusContent);
  })

  beforeEach(() => {
    dataProvider = jasmine.createSpyObj( 'FakeDataProvider',  {
      connect: 1,
      listen: undefined,
      disconnect: undefined,
      destroy: undefined,
    });

    const prefs = extractJson(prefsJson);
    const status = extractJson(statusJson);

    dataProvider.network = extractNetwork(status);
    dataProvider.health = extractHealth(status);
    dataProvider.prefs = extractPrefs(prefs);
    dataProvider.nodes = extractNodes(status);
  });

  it('Should be created', function () {
    const preferences = new Preferences(dataProvider);

    expect(preferences).toBeDefined();
    expect(dataProvider.connect).toHaveBeenCalledTimes(4);
    expect(dataProvider.listen).toHaveBeenCalledTimes(1);
  });

  it('Properties should be defined and same as textures', function () {
    dataProvider.connect.and.callFake((event, callback) =>  callback());
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

  it('Checks properties depends from prefs', function () {
    let prefsCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::prefs') {
        prefsCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    // [enabled, loggedIn, loginPageUrl, acceptRoutes, shieldsUp, webClient, exitNode, allowLanAccess]
    dataProvider.prefs = '[true,true,"https://test.node.com",false,true,false,"nQHfhyY3PC21CNTRL",true]';
    prefsCallback();
    expect(preferences.enabled).toBeTruthy();
    expect(preferences.loggedIn).toBeTruthy();
    expect(preferences.loginPageUrl).toBe('https://test.node.com');
    expect(preferences.acceptRoutes).toBeFalsy();
    expect(preferences.shieldsUp).toBeTruthy();
    expect(preferences.webClient).toBeFalsy();
    expect(preferences.exitNode).toBe('nQHfhyY3PC21CNTRL');
    expect(preferences.allowLanAccess).toBeTruthy();

    dataProvider.prefs = '[false,false,"https://test.node.ua",true,false,true,"DQHfhyY7PC21CNTRL",false]';
    prefsCallback();
    expect(preferences.enabled).toBeFalsy();
    expect(preferences.loggedIn).toBeFalsy();
    expect(preferences.loginPageUrl).toBe('https://test.node.ua');
    expect(preferences.acceptRoutes).toBeTruthy();
    expect(preferences.shieldsUp).toBeFalsy();
    expect(preferences.webClient).toBeTruthy();
    expect(preferences.exitNode).toBe('DQHfhyY7PC21CNTRL');
    expect(preferences.allowLanAccess).toBeFalsy();
  });

  it('Checks properties depends from network', function () {
    let networkCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::network') {
        networkCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    // [networkName, domain]
    dataProvider.network = '["some network", "http://example.com"]';
    networkCallback();
    expect(preferences.networkName).toBe('some network');
    expect(preferences.domain).toBe('http://example.com');

    dataProvider.network = '["network some", "http://example.ua"]';
    networkCallback();
    expect(preferences.networkName).toBe('network some');
    expect(preferences.domain).toBe('http://example.ua');

  });

  it('Checks properties depends from health', function () {
    let healthCallback;
    dataProvider.connect.and.callFake((event, callback) => {
      if (event === 'notify::health') {
        healthCallback = callback;
      }
      callback();
      return 1
    });
    const preferences = new Preferences(dataProvider);

    // [string, string]
    dataProvider.health = '["Some message 1", "Some message 2"]';
    healthCallback();
    expect(preferences.health).toBe('["Some message 1", "Some message 2"]');

    dataProvider.health = '[]';
    healthCallback();
    expect(preferences.health).toBe('[]');

  });

  describe('PeersListModel', function () {
    it('Peer nodes should be added', function () {
      dataProvider.connect.and.callFake((event, callback) => (callback() || 1));
      const preferences = new Preferences(dataProvider);

      // nodes [[id, domain, name, os, [tags], ipV4, ipV6, active, online, exitActive, exitSupport], ...]
      const nodesRaw = JSON.parse(dataProvider.nodes);
      const _node1 = preferences.nodes.find(nodesRaw[3][0]);

      expect(preferences.nodes.length).toEqual(5);
      expect(_node1).toBeDefined();
      expect(_node1.domain).toBe('amsterdam.local-domain.net.');
      expect(_node1.name).toBe('amsterdam');
      expect(_node1.os).toBe(nodesRaw[3][3]);
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

      expect(preferences.nodes.length).toEqual(5);

      preferences.nodes.remove('nVquKqjvxV11CNTRL');
      expect(preferences.nodes.length).toEqual(4);
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
        expect(removed).toEqual(5);
        expect(added).toEqual(2);
      });

      // nodes [[id, domain, name, os, [tags], ipV4, ipV6, active, online, exitActive, exitSupport], ...]
      const peersRaw = JSON.parse(dataProvider.nodes);

      const peers = [
        [...peersRaw[0]],
        [...peersRaw[1]],
      ]
      preferences.nodes.changeAll(peers);

      expect(preferences.nodes.length).toEqual(2);
    });

    it('PeerModel should changed by put method', function () {
      const onChange = jasmine.createSpy()
      dataProvider.connect.and.callFake((event, callback) => callback());
      const preferences = new Preferences(dataProvider);
      preferences.nodes.connect('items-changed', onChange);

      const [id, domain, ...nodesRaw] = JSON.parse(dataProvider.nodes)[0];
      preferences.nodes.append([id, 'new.domain', ...nodesRaw]);

      expect(preferences.nodes.length).toEqual(5);
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