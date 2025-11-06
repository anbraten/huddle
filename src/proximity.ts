import type { User } from "../shared/types";

export interface Cluster {
  userIds: Set<string>;
  users: User[];
  center: { x: number; y: number };
  radius: number;
}

export class ProximityManager {
  private readonly PROXIMITY_DISTANCE: number;
  private readonly BUBBLE_PADDING = 40;
  private readonly BUBBLE_MIN_RADIUS = 80;

  constructor(proximityDistance: number = 120) {
    this.PROXIMITY_DISTANCE = proximityDistance;
  }

  /**
   * Calculate conversation clusters using graph connectivity
   * Returns clusters that contain 2 or more users in proximity
   */
  public calculateClusters(users: Map<string, User>): Cluster[] {
    const usersArray = Array.from(users.values());
    if (usersArray.length < 2) return [];

    // Build adjacency map - who is in range of whom
    const inRange = this.buildProximityGraph(usersArray);

    // Find connected components (clusters) using DFS
    const clusters = this.findConnectedComponents(usersArray, inRange);

    // Convert to cluster data with geometry
    return clusters
      .filter((cluster) => cluster.size >= 2) // Only clusters with 2+ users
      .map((cluster) => this.createClusterData(cluster));
  }

  /**
   * Get all clusters that include a specific user
   */
  public getClustersForUser(userId: string, allClusters: Cluster[]): Cluster[] {
    return allClusters.filter((cluster) => cluster.userIds.has(userId));
  }

  /**
   * Get all users in the same cluster(s) as the given user
   */
  public getUsersInProximity(
    userId: string,
    allClusters: Cluster[]
  ): Set<string> {
    const proximityUsers = new Set<string>();

    this.getClustersForUser(userId, allClusters).forEach((cluster) => {
      cluster.userIds.forEach((id) => {
        if (id !== userId) {
          proximityUsers.add(id);
        }
      });
    });

    return proximityUsers;
  }

  /**
   * Check if two users are in the same cluster
   */
  public areUsersInSameCluster(
    userId1: string,
    userId2: string,
    clusters: Cluster[]
  ): boolean {
    return clusters.some(
      (cluster) => cluster.userIds.has(userId1) && cluster.userIds.has(userId2)
    );
  }

  private buildProximityGraph(users: User[]): Map<string, Set<string>> {
    const inRange = new Map<string, Set<string>>();

    // Initialize empty sets for all users
    users.forEach((user) => {
      inRange.set(user.id, new Set());
    });

    // Check all pairs for proximity
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];
        const distance = this.getDistance(user1, user2);

        if (distance < this.PROXIMITY_DISTANCE) {
          inRange.get(user1.id)!.add(user2.id);
          inRange.get(user2.id)!.add(user1.id);
        }
      }
    }

    return inRange;
  }

  private findConnectedComponents(
    users: User[],
    inRange: Map<string, Set<string>>
  ): Set<User>[] {
    const clusters: Set<User>[] = [];
    const visited = new Set<string>();

    const dfs = (userId: string, cluster: Set<User>) => {
      if (visited.has(userId)) return;
      visited.add(userId);

      const user = users.find((u) => u.id === userId);
      if (!user) return;

      cluster.add(user);

      // Visit all connected users
      inRange.get(userId)?.forEach((neighborId) => {
        dfs(neighborId, cluster);
      });
    };

    // Find all connected components
    users.forEach((user) => {
      if (!visited.has(user.id) && inRange.get(user.id)!.size > 0) {
        const cluster = new Set<User>();
        dfs(user.id, cluster);
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  private createClusterData(clusterSet: Set<User>): Cluster {
    const users = Array.from(clusterSet);
    const userIds = new Set(users.map((u) => u.id));

    // Calculate center point (centroid)
    const center = {
      x: users.reduce((sum, u) => sum + u.x, 0) / users.length,
      y: users.reduce((sum, u) => sum + u.y, 0) / users.length,
    };

    // Calculate radius needed to encompass all users
    const maxDistance = Math.max(
      ...users.map((u) => {
        const dx = u.x - center.x;
        const dy = u.y - center.y;
        return Math.sqrt(dx * dx + dy * dy);
      })
    );

    // Avatar size is hardcoded to match renderer for now
    const AVATAR_SIZE = 50;
    const radius = Math.max(
      maxDistance + AVATAR_SIZE / 2 + this.BUBBLE_PADDING,
      this.BUBBLE_MIN_RADIUS
    );

    return { userIds, users, center, radius };
  }

  private getDistance(user1: User, user2: User): number {
    const dx = user1.x - user2.x;
    const dy = user1.y - user2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
