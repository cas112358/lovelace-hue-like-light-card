export class Color {
    protected _red: number;
    protected _green: number;
    protected _blue: number;
    protected _opacity: number;

    public static readonly LuminanceBreakingPoint = 192; // hue breaking point is pretty high

    constructor(colorOrRed: string | number, opacityOrGreen?: number, blue?: number, opacity = 1) {
        if (typeof colorOrRed == 'string') {
            this.parse(colorOrRed);
            this._opacity = opacityOrGreen ?? 1;
        } else {
            this._red = colorOrRed;
            this._green = opacityOrGreen ?? 0;
            this._blue = blue ?? 0;
            this._opacity = opacity;
        }
    }

    /**
     * Gets opacity of this color.
     */
    public getOpacity(): number {
        return this._opacity;
    }

    /**
     * Returns relative luminance (0-255).
     */
    public getLuminance(): number {
        return this._red * 0.299 + this._green * 0.587 + this._blue * 0.114;
    }

    /**
     * Returns foreground for this color, either @param light (potentially white) or @param dark (potentially black).
     * @param offset: offset added to luminance: higher value => sooner dark foreground (can be negative)
     */
    public getForeground<T>(light: T, dark: T, offset: number): T {
        const luminance = this.getLuminance();
        return (luminance + offset) < Color.LuminanceBreakingPoint ? light : dark;
    }

    /**
    * Parses the given color string. Only supports color name, rgb(a) and hex format.
    */
    private parse(color_id: string, allowNames = true): void {
        if (color_id.startsWith('#')) {
            color_id = color_id.substring(1);
            if (color_id.length == 3) {
                this._red = parseInt(color_id.substring(0, 1) + color_id.substring(0, 1), 16);
                this._green = parseInt(color_id.substring(1, 2) + color_id.substring(1, 2), 16);
                this._blue = parseInt(color_id.substring(2, 3) + color_id.substring(2, 3), 16);
            } else if (color_id.length == 6) {
                this._red = parseInt(color_id.substring(0, 2), 16);
                this._green = parseInt(color_id.substring(2, 4), 16);
                this._blue = parseInt(color_id.substring(4, 6), 16);
            } else {
                throw new Error('Hex color format should have 3 or 6 letters');
            }
        } else if (color_id.startsWith('rgb')) {
            const parts = color_id.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,?\s*(\d*(?:\.\d+\s*)?)\)$/);
            if (!parts) {
                throw new Error('Unrecognized color format rgb[a]: ' + color_id);
            } else {
                // [ str, r, g, b, a|undefined ]
                this._red = parseInt(parts[1]);
                this._green = parseInt(parts[2]);
                this._blue = parseInt(parts[3]);
            }
        } else {
            if (allowNames) {
                // small hack: https://stackoverflow.com/a/47355187/1341409
                const ctx = document.createElement('canvas').getContext('2d');
                if (ctx != null) {
                    ctx.fillStyle = color_id;
                    this.parse(ctx.fillStyle, false); // standardized color format (hex)
                    return;
                }
            }

            throw new Error('Unrecognized color format: ' + color_id);
        }
    }

    public toString(): string {
        if (this._opacity < 1) {
            return `rgba(${this._red}, ${this._green}, ${this._blue}, ${this._opacity})`;
        }

        return `rgb(${this._red}, ${this._green}, ${this._blue})`;
    }
}