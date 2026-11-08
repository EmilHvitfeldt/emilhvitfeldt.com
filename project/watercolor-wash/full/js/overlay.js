// A reference image shown over (or under) the painting for tracing. It's
// purely a view aid: it never touches the simulation and isn't saved with
// the project.
// Classic script (see random.js for why).

class TraceOverlay {
  constructor({ image, stage, onChange }) {
    this.image = image;
    this.stage = stage;
    this.onChange = onChange;
    this.url = null;
    this.loaded = false;
    this.naturalWidth = 1;
    this.naturalHeight = 1;
    this.visible = true;
    this.opacity = 0.5;
    this.above = true;
    this.grayscale = false;
    this.invert = false;
    this.resetPlacement();
  }

  resetPlacement() {
    // Center of the image as a fraction of the stage; scale 1 = fit inside the stage.
    this.cx = 0.5;
    this.cy = 0.5;
    this.scale = 1;
    this.rotation = 0;
  }

  async load(file) {
    const url = URL.createObjectURL(file);
    this.image.src = url;
    try {
      await this.image.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("Could not read that image.");
    }

    if (this.url) URL.revokeObjectURL(this.url);
    this.url = url;
    this.loaded = true;
    this.naturalWidth = this.image.naturalWidth;
    this.naturalHeight = this.image.naturalHeight;
    this.visible = true;
    this.resetPlacement();
    this.render();
    this.onChange();
  }

  remove() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.loaded = false;
    this.image.removeAttribute("src");
    this.render();
    this.onChange();
  }

  render() {
    const image = this.image;
    image.hidden = !this.loaded || !this.visible;
    if (image.hidden) return;

    const stageWidth = this.stage.clientWidth;
    const stageHeight = this.stage.clientHeight;
    const fit = Math.min(stageWidth / this.naturalWidth, stageHeight / this.naturalHeight) * this.scale;
    const width = this.naturalWidth * fit;
    const height = this.naturalHeight * fit;

    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    image.style.left = `${this.cx * stageWidth - width / 2}px`;
    image.style.top = `${this.cy * stageHeight - height / 2}px`;
    image.style.transform = `rotate(${this.rotation}deg)`;
    image.style.opacity = String(this.opacity);
    image.style.filter = [this.grayscale ? "grayscale(1)" : "", this.invert ? "invert(1)" : ""].join(" ").trim() || "none";
    image.classList.toggle("trace-above", this.above);
    image.classList.toggle("trace-below", !this.above);
  }
}
