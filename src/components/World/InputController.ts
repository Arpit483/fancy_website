import type { InputState } from '@/types/world';

export class InputController {
  private state: InputState = {
    left: false,
    right: false,
    interact: false,
  };
  private touchLeft = false;
  private touchRight = false;

  public get input(): InputState {
    return {
      left: this.state.left || this.touchLeft,
      right: this.state.right || this.touchRight,
      interact: this.state.interact,
    };
  }

  public handleKeyDown(code: string): boolean {
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.state.left = true;
      return true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      this.state.right = true;
      return true;
    }
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') {
      this.state.interact = true;
      return true;
    }
    return false;
  }

  public handleKeyUp(code: string): void {
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.state.left = false;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      this.state.right = false;
    }
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') {
      this.state.interact = false;
    }
  }

  public setTouchMove(direction: 'left' | 'right' | null): void {
    this.touchLeft = direction === 'left';
    this.touchRight = direction === 'right';
  }

  public resetInteract(): void {
    this.state.interact = false;
  }
}
