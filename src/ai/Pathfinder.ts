export interface TilePoint {
  x: number;
  y: number;
}

/** 8-directional A* on the facility tile grid (no corner cutting). */
export class Pathfinder {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly walkable: (x: number, y: number) => boolean,
  ) {}

  nearestWalkable(x: number, y: number, radius = 4): TilePoint | null {
    if (this.walkable(x, y)) return { x, y };
    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
      }
    }
    return null;
  }

  find(sx: number, sy: number, tx: number, ty: number, maxIterations = 9000): TilePoint[] | null {
    const start = this.nearestWalkable(sx, sy, 2);
    const goal = this.nearestWalkable(tx, ty, 4);
    if (!start || !goal) return null;
    const W = this.width;
    const key = (x: number, y: number): number => y * W + x;
    const startKey = key(start.x, start.y);
    const goalKey = key(goal.x, goal.y);
    if (startKey === goalKey) return [goal];

    const g = new Map<number, number>([[startKey, 0]]);
    const came = new Map<number, number>();
    const closed = new Set<number>();
    const heap: [number, number][] = [[0, startKey]];

    const push = (item: [number, number]): void => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = (): [number, number] | undefined => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length > 0 && last) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const h = (x: number, y: number): number => {
      const dx = Math.abs(x - goal.x);
      const dy = Math.abs(y - goal.y);
      return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };

    let iterations = 0;
    while (heap.length > 0 && iterations++ < maxIterations) {
      const node = pop();
      if (!node) break;
      const current = node[1];
      if (current === goalKey) {
        const path: TilePoint[] = [];
        let k: number | undefined = current;
        while (k !== undefined && k !== startKey) {
          path.push({ x: k % W, y: Math.floor(k / W) });
          k = came.get(k);
        }
        return path.reverse();
      }
      if (closed.has(current)) continue;
      closed.add(current);
      const cx = current % W;
      const cy = Math.floor(current / W);
      const cg = g.get(current) ?? 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= this.height) continue;
          if (!this.walkable(nx, ny)) continue;
          if (dx !== 0 && dy !== 0 && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue;
          const nk = key(nx, ny);
          if (closed.has(nk)) continue;
          const ng = cg + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            came.set(nk, current);
            push([ng + h(nx, ny), nk]);
          }
        }
      }
    }
    return null;
  }
}
