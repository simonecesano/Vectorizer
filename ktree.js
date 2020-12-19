// from https://github.com/caub/ktree/blob/master/ktree.mjs
var ktree = (function (exports) {
  'use strict';

  // polyfills
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (fn) {
      return [].concat(...this.map(fn))
    };
  }

  // carterian products
  const cart = (...args) => args.reduce((xs, a) => xs.flatMap(xsi => a.map(ai => [...xsi, ai])), [[]]);

  const dist1 = (c1, c2) => (c1[0] - c2[0]) ** 2;
  const dist2 = (c1, c2) => (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2;
  const dist3 = (c1, c2) => (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2;
  const distk = (c1, c2) => c1.map((_, i) => (c1[i] - c2[i]) ** 2).reduce((a, b) => a + b);

  const eq1 = (c1, c2) => c1[0] === c2[0];
  const eq2 = (c1, c2) => c1[0] === c2[0] && c1[1] === c2[1];
  const eq3 = (c1, c2) => c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];
  const eqk = (c1, c2) => c1.every((_, i) => c1[i] && c2[i]);

  const buildTree1 = (depth, n = 0) =>
    n >= depth
      ? { n, items: [] }
      : {
        n,
        items: [],
        '0': buildTree1(depth, n + 1),
        '1': buildTree1(depth, n + 1),
      };

  const buildTree2 = (depth, n = 0) =>
    n >= depth
      ? { n, items: [] }
      : {
        n,
        items: [],
        '00': buildTree2(depth, n + 1),
        '01': buildTree2(depth, n + 1),
        '10': buildTree2(depth, n + 1),
        '11': buildTree2(depth, n + 1),
      };
  const buildTree3 = (depth, n = 0) =>
    n >= depth
      ? { n, items: [] }
      : {
        n,
        items: [],
        '000': buildTree3(depth, n + 1),
        '001': buildTree3(depth, n + 1),
        '010': buildTree3(depth, n + 1),
        '011': buildTree3(depth, n + 1),
        '100': buildTree3(depth, n + 1),
        '101': buildTree3(depth, n + 1),
        '110': buildTree3(depth, n + 1),
        '111': buildTree3(depth, n + 1),
      };


  // get i-th  coordinates, concatenated to form a node key
  const getCoord = (coords, i) => coords.map(c => c & (1 << i) ? '1' : '0').reduce((a, b) => a + b);


  // distance between point coords and a sub-grid of resolution res
  const minDist = (pointCoords, gridCoords, res) => Math.min(
    ...pointCoords.map(
      (c, j) => Math.min(
        c - (gridCoords[j] << res),
        ((gridCoords[j] + 1) << res) - 1 - c
      )
    )
  );


  // generate a KTree class for a given k, for k=2, k=3 we try to put inline functions (defined above) for perf
  // todo bench if it's really faster
  const ktree = k => {

    const KEYS = cart(...Array.from({ length: k }, () => [0, 1])).map(a => a.join('')); // node's children keys
    const NS = cart(...Array.from({ length: k }, () => [-1, 0, 1])); // used for getNeighbors

    let buildTree;
    let getNeighbors;
    if (k === 1) {
      buildTree = buildTree1;
      getNeighbors = ([x], N) => {
        const nodes = [];
        for (let i = 0; i < NS.length; i++) {
          const X = x + NS[i][0];
          if (X >= 0 && X < N) {
            nodes.push([X]);
          }
        }
        return nodes;
      };
    }
    else if (k === 2) {
      buildTree = buildTree2;
      getNeighbors = ([x, y], N) => {
        const nodes = [];
        for (let i = 0; i < NS.length; i++) {
          const X = x + NS[i][0],
            Y = y + NS[i][1];
          if (X >= 0 && X < N && Y >= 0 && Y < N) {
            nodes.push([X, Y]);
          }
        }
        return nodes;
      };
    }
    else if (k === 3) {
      buildTree = buildTree3;
      getNeighbors = ([x, y, z], N) => {
        const nodes = [];
        for (let i = 0; i < NS.length; i++) {
          const X = x + NS[i][0],
            Y = y + NS[i][1],
            Z = z + NS[i][2];
          if (X >= 0 && X < N && Y >= 0 && Y < N && Z >= 0 && Z < N) {
            nodes.push([X, Y, Z]);
          }
        }
        return nodes;
      };
    }
    else {
      buildTree = (depth, n = 0) =>
        n >= depth
          ? { n, items: [] }
          : {
            n,
            items: [],
            ...KEYS.reduce((o, key) => ({ ...o, [key]: buildTree(depth, n + 1) }), {})
          };
      getNeighbors = (decs, N) => {
        const nodes = [];
        for (let i = 0; i < NS.length; i++) {
          const coords = decs.map((dec, j) => dec + NS[i][j]);
          if (coords.every(coord => coord >= 0 && coord < N)) {
            nodes.push(coords);
          }
        }
        return nodes;
      };
    }

    const eq = k === 2 ? eq2 : k === 3 ? eq3 : k === 1 ? eq1 : eqk;
    const dist = k === 2 ? dist2 : k === 3 ? dist3 : k === 1 ? dist1 : distk;

    return class KTree {
      constructor(items = [], { length = 8, depth = 4, key = 'coords', transform = x => x } = {}) {
        if (!(depth >= 1 && depth < length)) throw new Error(`initial depth must be between 1 and ${length}`);
        this.len = length;
        this.key = key;
        this.transform = transform;
        this.root = buildTree(depth);
        this.add(items);
      }
      add(items = []) {
        const data = !Array.isArray(items) ? [items] : items;
        data.forEach(c => this._add(c));
      }
      _add(item, root = this.root) {
        let node = root;
        const coords = this.transform(item);
        for (let i = this.len - 1 - root.n; i >= 0; i--) {
          const k = getCoord(coords, i);
          if (!node[k]) break;
          node = node[k];
          // store coords, for efficiency, and not overwrite possible existing one
          node.items.push({ coords, ...item, });
        }
        if (node.items.length > 1 && node.n < this.len - 1) { // expand further, to get a fastest .closest
          KEYS.forEach(k => {
            node[k] = buildTree(node.n + 1, node.n + 1);
          });
          node.items.forEach(it => this._add(it, node));
        }
      }
      remove(value) { // todo remove empty nodes
        let node = this.root;
        const coords = this.transform(value);
        for (let i = this.len - 1; i >= 0; i--) {
          const k = getCoord(coords, i);
          node = node[k];
          if (!node) break;
          node.items = Array.isArray(value) // todo clean that and set an isEqual 
            ? node.items.filter(c => !eq(value, c[this.key]))
            : node.items.filter(c => value !== c[this.key]);
        }
      }
      closest(value) {
        const coords = this.transform(value);
        const node = this.getNodeFromCoords(coords); // todo improve

        for (let i = node.n; i > 0; i--) {
          const res = this.len - i;
          const grid = coords.map(c => c >> res); // the grid of dimenions res containing the target coords
          const cs = getNeighbors(grid, 1 << i);
          const items = cs
            .flatMap(c => this.getNodeFromCoords(c, res).items);

          if (items.length) {
            const item = this.closestIn(coords, items);
            // keep only items in the neightbors, that are at a distance < dGrid + (1 << res) + 1 of the target coords
            // this value corresponds to the closest point not in the current neighbors
            const dGrid = minDist(coords, grid, res); // TODO improve by filtering the sides which are not at the limit
            if (item.d2 < dGrid + (1 << res) + 1)
              return item;
          }
        }
        // search in all
        const items = KEYS
          .flatMap(k => this.root[k].items);
        if (items.length) {
          return this.closestIn(coords, items);
        }
        // console.log(`Couldn't find any item`);
      }
      getNodeFromCoords(coords, resolution = 0) {
        let node = this.root;
        for (let i = this.len - 1 - resolution; i >= 0 && node[KEYS[0]]; i--) {
          node = node[getCoord(coords, i)];
        }
        return node;
      }
      closestIn(coords, items) {
        let minD2 = Infinity,
          current;
        items.forEach(item => {
          const d2 = dist(coords, item.coords);
          if (d2 < minD2) {
            minD2 = d2;
            current = item;
          }
        });
        return { ...current, d2: minD2 };
      }
      toJSON() {
        return prettify(this.root, this.key);
      }
    };
  };


  const prettify = ({ n, items = [], ...o } = {}, key) => n === 0 || items.length ? ({
    items: items.map(x => x[key]).join(', '),
    cs: Object.keys(o).reduce((a, k) => ({ ...a, [k]: prettify(o[k], key) }), {}) // group children keys together else 0 come before n/items
  }) : undefined;

  const Quadtree = ktree(2);
  const Octree = ktree(3);

  exports.Octree = Octree;
  exports.Quadtree = Quadtree;

  return exports;

}({}));
