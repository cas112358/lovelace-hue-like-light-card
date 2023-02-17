import { ResourcesInterface } from './types-config';

export class Resources implements ResourcesInterface {
    /**
     * Creates new instance of text resources.
     */
    constructor(config:ResourcesInterface | undefined) {
        config = config || {};

        this.scenes = config.scenes || 'MY SCENES';
        this.lights = config.lights || 'LIGHTS';
    }

    readonly scenes: string;
    readonly lights: string;
}