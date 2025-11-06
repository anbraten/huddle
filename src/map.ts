export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  label?: string;
}

export interface SpawnZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OfficeMap {
  private walls: Rectangle[] = [];
  private zones: Rectangle[] = [];
  private spawnZone: SpawnZone;
  public readonly width: number;
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.spawnZone = { x: 0, y: 0, width: 0, height: 0 };
    this.createOfficeLayout();
  }

  private createOfficeLayout() {
    const w = this.width;
    const h = this.height;
    const wallThickness = 20;

    // Outer walls
    this.walls.push(
      { x: 0, y: 0, width: w, height: wallThickness, color: "#334155" }, // Top
      {
        x: 0,
        y: h - wallThickness,
        width: w,
        height: wallThickness,
        color: "#334155",
      }, // Bottom
      { x: 0, y: 0, width: wallThickness, height: h, color: "#334155" }, // Left
      {
        x: w - wallThickness,
        y: 0,
        width: wallThickness,
        height: h,
        color: "#334155",
      } // Right
    );

    // Internal walls to create rooms
    const midX = w / 2;
    const midY = h / 2;

    // Vertical divider (with gap for doorway)
    this.walls.push(
      {
        x: midX - 10,
        y: wallThickness,
        width: 20,
        height: midY - 80,
        color: "#475569",
      },
      {
        x: midX - 10,
        y: midY + 60,
        width: 20,
        height: midY - wallThickness - 60,
        color: "#475569",
      }
    );

    // Horizontal divider in left section (meeting room separator)
    this.walls.push({
      x: wallThickness,
      y: midY - 10,
      width: midX - 100 - wallThickness,
      height: 20,
      color: "#475569",
    });

    // Define zones (visual areas with different floor colors)
    this.zones.push(
      {
        x: wallThickness,
        y: wallThickness,
        width: midX - wallThickness - 10,
        height: midY - wallThickness - 10,
        color: "#E0F2FE",
        label: "Entry",
      },
      {
        x: wallThickness,
        y: midY + 10,
        width: midX - wallThickness - 10,
        height: midY - wallThickness - 10,
        color: "#FEF3C7",
        label: "Meeting Room",
      },
      {
        x: midX + 10,
        y: wallThickness,
        width: w - midX - wallThickness - 10,
        height: h - 2 * wallThickness,
        color: "#F0FDF4",
        label: "Open Office",
      }
    );

    // Define spawn zone (entry area)
    this.spawnZone = {
      x: wallThickness + 50,
      y: wallThickness + 50,
      width: midX - wallThickness - 120,
      height: midY - wallThickness - 120,
    };
  }

  public getRandomSpawnPosition(): { x: number; y: number } {
    return {
      x: this.spawnZone.x + Math.random() * this.spawnZone.width,
      y: this.spawnZone.y + Math.random() * this.spawnZone.height,
    };
  }

  public checkCollision(x: number, y: number, radius: number): boolean {
    // Check collision with all walls
    for (const wall of this.walls) {
      if (this.circleRectCollision(x, y, radius, wall)) {
        return true;
      }
    }
    return false;
  }

  private circleRectCollision(
    cx: number,
    cy: number,
    radius: number,
    rect: Rectangle
  ): boolean {
    // Find the closest point on the rectangle to the circle
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

    // Calculate distance between circle center and closest point
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < radius * radius;
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Draw zones (floor colors)
    this.zones.forEach((zone) => {
      ctx.fillStyle = zone.color || "#F8FAFC";
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

      // Draw zone label
      if (zone.label) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          zone.label,
          zone.x + zone.width / 2,
          zone.y + zone.height / 2
        );
        ctx.restore();
      }
    });

    // Draw walls
    this.walls.forEach((wall) => {
      ctx.fillStyle = wall.color || "#334155";
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Add subtle shadow/3D effect to walls
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.restore();
    });
  }
}
