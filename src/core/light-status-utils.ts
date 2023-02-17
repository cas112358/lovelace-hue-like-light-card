import { LightController } from './light-controller';

export class LightStatusUtils {

    /**
     * Gets the status of lights in a control.
     */
    public static getLightStatus(ctrl: LightController) {
       
        if ( ctrl.isOff() ) {
            return 'All lights are off';
        }

        const lightsOn = ctrl.getLitLights().length;
        const allLights = ctrl.count;

        if ( lightsOn == 1 ) {
            return '1 light is on';
        }

        if ( lightsOn == allLights ) {
            return 'All lights are on';
        }

        if ( lightsOn > 1 ) {
            return lightsOn + ' lights are on';
        }

        return '';
    }
}