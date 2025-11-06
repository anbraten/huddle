export class InputManager {
  private keys: Set<string> = new Set();
  private readonly MOVEMENT_KEYS = [
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowleft",
    "arrowdown",
    "arrowright",
    "shift",
  ];

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (this.MOVEMENT_KEYS.includes(key)) {
        e.preventDefault();
        this.keys.add(key);
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
    });
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  public isMovingUp(): boolean {
    return this.isKeyPressed("w") || this.isKeyPressed("arrowup");
  }

  public isMovingDown(): boolean {
    return this.isKeyPressed("s") || this.isKeyPressed("arrowdown");
  }

  public isMovingLeft(): boolean {
    return this.isKeyPressed("a") || this.isKeyPressed("arrowleft");
  }

  public isMovingRight(): boolean {
    return this.isKeyPressed("d") || this.isKeyPressed("arrowright");
  }

  public isSpeedBoostActive(): boolean {
    return this.isKeyPressed("shift");
  }

  public isMoving(): boolean {
    return (
      this.isMovingUp() ||
      this.isMovingDown() ||
      this.isMovingLeft() ||
      this.isMovingRight()
    );
  }
}
