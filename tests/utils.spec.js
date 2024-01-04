const { Gio } = imports.gi;
const { extractJson, extractPrefs, extractNetwork, extractHealth, extractNodes } = imports.libs.utils;

const decoder = new TextDecoder('utf-8');

describe('src/libs/utils.js', () => {
  let prefsJson, statusJson;

  beforeAll(() => {
    const [,prefsContent] = Gio.File.new_for_path(`./tests/fixtures/prefs-0.json`).load_contents(null);
    const [,statusContent] = Gio.File.new_for_path(`./tests/fixtures/status-0.json`).load_contents(null);

    prefsJson = decoder.decode(prefsContent);
    statusJson = decoder.decode(statusContent);
  })

  describe('extractJson', () => {
    it('Normal extraction', () => {
      expect(() => extractJson(prefsJson)).not.toThrow();
      const result = extractJson(statusJson);
      expect(result).not.toBeNull();
    });

    it('Extracted from a dirty file', () => {
      const dirtyJson = ':_-/?%&some data not contain JSON valid' + prefsJson + 'some data not contain JSON valid:_-/?%&';

      expect(() => extractJson(dirtyJson)).not.toThrow();
      const result = extractJson(dirtyJson);
      expect(result).not.toBeNull();
    })
  });

  describe('extractPrefs', () => {
    it('Should be returns walid prefs string', () => {
      const result = extractJson(prefsJson);
      const prefs = extractPrefs(result);

      expect(prefs).toBe('[true,true,"https://test.node.com",false,true,false,"nQHfhyY3PC21CNTRL",true]');
      expect(() => JSON.parse(prefs)).not.toThrow();
    });

    it('Shouldn\'t throw error if no data', () => {
      expect(() => {
        const prefs = extractPrefs();

        expect(prefs).toBe('[]');
        expect(() => JSON.parse(prefs)).not.toThrow();
      }).not.toThrow();
    });
  });

  describe('extractNetwork', () => {
    it('Should be returns walid prefs string', () => {
      const result = extractJson(statusJson);
      const network = extractNetwork(result);

      expect(network).toBe('["email@gmail.com","local-domain.net","nYsTpNwY6321CNTRL"]');
      expect(() => JSON.parse(network)).not.toThrow();
    });

    it('Shouldn\'t throw error if no data', () => {
      expect(() => {
        const prefs = extractNetwork();

        expect(prefs).toBe('["","",""]');
        expect(() => JSON.parse(prefs)).not.toThrow();
      }).not.toThrow();
    });
  });

  describe('extractHealth', () => {
    it('Should be returns walid prefs string', () => {
      const result = extractJson(statusJson);
      const health = extractHealth(result);

      expect(health).toBe('["Test health message"]');
      expect(() => JSON.parse(health)).not.toThrow();
    });

    it('Shouldn\'t throw error if no data', () => {
      expect(() => {
        const health = extractHealth();

        expect(health).toBe('[]');
        expect(() => JSON.parse(health)).not.toThrow();
      }).not.toThrow();
    });
  });

  describe('extractNodes', () => {
    it('Should be returns walid prefs string', () => {
      const result = extractJson(statusJson);
      const key = Object.keys(result.Peer)[0];
      result.Peer = {
        [key]: result.Peer[key],
      }

      const nodes = extractNodes(result);

      expect(nodes).toBe('[["nYsTpNwY6321CNTRL","msi.local-domain.net.","msi","linux",[],"100.0.245.32","fd7a:115c:a1e0::de11:f520",false,true,false,false],["n35iHGi71611CNTRL","device.local-domain.net.","device","android",["tag:home"],"100.124.255.58","fd7a:115c:a1e0::f27c:ff3a",false,false,false,false]]');
      expect(() => JSON.parse(nodes)).not.toThrow();
    });

    it('Shouldn\'t throw error if no data', () => {
      expect(() => {
        const nodes = extractNodes();

        expect(nodes).toBe('[]');
        expect(() => JSON.parse(nodes)).not.toThrow();
      }).not.toThrow();
    });
  });
});