import { OfficeMap } from "./map";
import type { User } from "../shared/types";
import type { Cluster } from "./proximity";

export type { User };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private readonly AVATAR_SIZE = 50;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render({
    width,
    height,
    map,
    users,
    currentUser,
    connectedPeers,
    clusters,
  }: {
    width: number;
    height: number;
    map: OfficeMap;
    users: Map<string, User>;
    currentUser: User | null;
    connectedPeers: Set<string>;
    clusters: Cluster[];
  }) {
    // Clear canvas
    this.ctx.fillStyle = "#F8FAFC";
    this.ctx.fillRect(0, 0, width, height);

    // Draw map (zones and walls)
    map.render(this.ctx);

    // Draw conversation bubbles for clusters containing current user
    if (currentUser) {
      clusters.forEach((cluster) => {
        if (cluster.userIds.has(currentUser.id)) {
          this.drawConversationBubble(cluster);
        }
      });
    }

    // Draw all users
    users.forEach((user) => {
      const isCurrentUser = user.id === currentUser?.id;
      this.drawUser(user, isCurrentUser);

      // Draw voice indicator if connected
      if (!isCurrentUser && connectedPeers.has(user.id)) {
        this.drawVoiceIndicator(user);
      }
    });
  }

  private drawConversationBubble(cluster: Cluster) {
    const ctx = this.ctx;

    ctx.save();

    // Draw bubble circle with gradient
    const gradient = ctx.createRadialGradient(
      cluster.center.x,
      cluster.center.y,
      0,
      cluster.center.x,
      cluster.center.y,
      cluster.radius
    );
    gradient.addColorStop(0, "rgba(102, 126, 234, 0.08)");
    gradient.addColorStop(1, "rgba(102, 126, 234, 0.2)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cluster.center.x, cluster.center.y, cluster.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = "rgba(102, 126, 234, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.stroke();

    // Draw conversation icon at the top of the bubble
    ctx.restore();
    ctx.save();

    const iconY = cluster.center.y - cluster.radius + 20;
    ctx.fillStyle = "rgba(102, 126, 234, 0.9)";
    ctx.shadowColor = "rgba(102, 126, 234, 0.4)";
    ctx.shadowBlur = 10;

    // Draw small badge
    this.roundRect(cluster.center.x - 20, iconY - 16, 40, 32, 16);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💬", cluster.center.x, iconY);

    // Draw user count
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(cluster.users.length.toString(), cluster.center.x, iconY + 20);

    ctx.restore();
  }

  private drawVoiceIndicator(user: User) {
    const ctx = this.ctx;
    const indicatorY = user.y - this.AVATAR_SIZE / 2 - 15;

    ctx.save();
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw speaker emoji with green glow
    ctx.shadowColor = "#10B981";
    ctx.shadowBlur = 10;
    ctx.fillText("🔊", user.x, indicatorY);

    ctx.restore();
  }

  private drawUser(user: User, isCurrentUser: boolean) {
    const ctx = this.ctx;
    const size = this.AVATAR_SIZE;

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Draw avatar circle
    ctx.beginPath();
    ctx.arc(user.x, user.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = user.color;
    ctx.fill();

    // Border
    ctx.lineWidth = isCurrentUser ? 4 : 3;
    ctx.strokeStyle = isCurrentUser ? "#FFF" : "rgba(255, 255, 255, 0.8)";
    ctx.stroke();

    ctx.restore();

    // Draw initial
    ctx.fillStyle = "#FFF";
    ctx.font = `bold ${size / 2}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = user.name.charAt(0).toUpperCase();
    ctx.fillText(initial, user.x, user.y);

    // Draw name label
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Background for name
    const nameWidth = ctx.measureText(user.name).width + 16;
    const nameHeight = 24;
    const nameX = user.x - nameWidth / 2;
    const nameY = user.y + size / 2 + 10;

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 8;
    this.roundRect(nameX, nameY, nameWidth, nameHeight, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isCurrentUser ? user.color : "#64748B";
    ctx.fillText(user.name, user.x, nameY + 5);
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
