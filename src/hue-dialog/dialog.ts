import { applyThemesOnElement } from 'custom-card-helpers';
import { css, LitElement, PropertyValues, unsafeCSS } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { customElement, state } from 'lit/decorators.js';
import { cache } from 'lit/directives/cache.js';
import { Background } from '../core/colors/background';
import { Color } from '../core/colors/color';
import { LightController } from '../core/light-controller';
import { ViewUtils } from '../core/view-utils';
import { HueLikeLightCardConfig } from '../types/config';
import { Consts } from '../types/consts';
import { HueDialogTile } from './dialog-tile';
import { HaDialog } from '../types/types';
import { ThemeHelper } from '../types/theme-helper';
import { GlobalLights } from '../core/global-lights';

type Tab = 'colors' | 'scenes';

@customElement(HueDialog.ElementName)
export class HueDialog extends LitElement {

    /**
     * Name of this Element
     */
    public static readonly ElementName = Consts.CardElementName + '-hue-dialog';

    /*
    Doc:
    https://material-components.github.io/material-components-web-catalog/#/component/dialog
    */

    private _isRendered = false;
    private _config: HueLikeLightCardConfig;
    private _ctrl: LightController;
    private _id: string;

    constructor(config: HueLikeLightCardConfig, lightController: LightController) {
        super();

        this._config = config;
        this._ctrl = lightController;
        this._id = 'HueDialog_' + HueDialog.maxDialogId++;
    }

    //#region Hass changes

    private static maxDialogId = 1;

    private onLightControllerChanged(propertyName: keyof LightController) {
        // when LightController changed - update this
        if (propertyName == 'hass') {
            this.requestUpdate();
        }
    }

    //#endregion

    //#region Tabs

    private static readonly colorsTab: Tab = 'colors';
    private static readonly scenesTab: Tab = 'scenes';
    private static readonly tabs = [HueDialog.colorsTab, HueDialog.scenesTab]; //TODO: Remove tabs, use css animation hide of scenes and show of colorpicker

    @state()
    private _currTab = HueDialog.scenesTab;

    //#endregion

    //#region show/hide

    /**
     * Insert and renders this dialog into <home-assistant>.
     */
    public show(): void {
        if (this._isRendered)
            throw new Error('Already rendered!');

        window.history.pushState(
            { dialog: 'hue-dialog', open: true },
            ''
        );
        window.addEventListener('popstate', this._onHistoryBackListener);

        // append to DOM
        document.body.appendChild(this);

        // register update delegate
        this._ctrl.registerOnPropertyChanged(this._id, (p) => this.onLightControllerChanged(p));
    }

    public close(): void {
        if (!this._isRendered)
            return;

        // try to find dialog (if no success, call standard remove)
        const haDialog = this.getDialogElement();
        if (haDialog && haDialog.close) {
            haDialog.close();
        } else {
            this.onDialogClose();
        }
    }

    private getDialogElement(): HaDialog | null {
        if (!this._isRendered)
            return null;

        return this.renderRoot.querySelector('ha-dialog');
    }

    private readonly _onHistoryBackListener = () => this.close();

    /** When the dialog is closed. Removes itself from the DOM. */
    private onDialogClose() {
        if (this._isRendered) {
            this.remove();

            // unregister popstate
            window.removeEventListener('popstate', this._onHistoryBackListener);

            // unregister update delegate
            this._ctrl.unregisterOnPropertyChanged(this._id);

            this._isRendered = false;
        }
    }

    //#endregion

    /**
     * Default ha-dialog styles from HA.
     * See https://github.com/home-assistant/frontend/blob/dev/src/resources/styles.ts
     */
    static haStyleDialog = css`
    /* mwc-dialog (ha-dialog) styles */
    ha-dialog {
      --mdc-dialog-min-width: 400px;
      --mdc-dialog-max-width: 600px;
      --mdc-dialog-heading-ink-color: var(--primary-text-color);
      --mdc-dialog-content-ink-color: var(--primary-text-color);
      --justify-action-buttons: space-between;
    }
    ha-dialog .form {
      color: var(--primary-text-color);
    }
    a {
      color: var(--primary-color);
    }
    /* make dialog fullscreen on small screens */
    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: calc(
          100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
        );
        --mdc-dialog-max-width: calc(
          100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
        );
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0px;
      }
    }
    mwc-button.warning {
      --mdc-theme-primary: var(--error-color);
    }
    .error {
      color: var(--error-color);
    }
  `;

    private static readonly tileGap = 10;
    private static readonly haPadding = 24;

    static get styles() {
        return [
            HueDialog.haStyleDialog,
            css`
        /* icon centering */
        .mdc-icon-button i,
        .mdc-icon-button svg,
        .mdc-icon-button img,
        .mdc-icon-button ::slotted(*){
            height:auto;
        }

        /* same color header */
        .heading {
            color:var(--hue-text-color, ${unsafeCSS(Consts.ThemePrimaryTextColorVar)});
            background:var(--hue-background, ${unsafeCSS(Consts.ThemeCardBackgroundVar)} );
            box-shadow:var(--hue-box-shadow), 0px 5px 10px rgba(0,0,0,0.5);
            transition:all 0.3s ease-out 0s;

            border-bottom-left-radius: var(--ha-dialog-border-radius, 28px);
            border-bottom-right-radius: var(--ha-dialog-border-radius, 28px);
            padding-bottom: calc(var(--ha-dialog-border-radius, 8px) / 2);

            overflow:hidden;
        }
        ha-header-bar {
            --mdc-theme-on-primary: var(--hue-text-color);
            --mdc-theme-primary: transparent;
            flex-shrink: 0;
            display: block;
        }
        .heading ha-switch {
            margin-top: 10px;
            margin-right: 10px;
        }
        .heading ha-slider {
            width: 100%;
        }
        /* Disable the bottom border radius */
        /* in default styles: --ha-border-radius=0 in this case */
        /*
        @media all and (max-width: 450px), all and (max-height: 500px) {
            border-bottom-left-radius: none;
            border-bottom-right-radius: none;
            padding-bottom: none;
        }
        */

        /* titles */
        .header{
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .header .title{
            color: ${unsafeCSS(Consts.ThemeSecondaryTextColorVar)};
            font:Roboto;font-size:11px;
            font-weight:600;
        }

        .content {
            outline: none;
        }

        /* tiles - scenes, lights */
        .tile-scroller {
            display: flex;
            flex-flow: column;
            /*gap: ${HueDialog.tileGap}px;*/
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 ${HueDialog.haPadding}px;
            margin: 0 -${HueDialog.haPadding}px;
        }
        .tiles {
            display: flex;
            flex-flow: row;
            gap: ${HueDialog.tileGap}px;
            margin-bottom: ${HueDialog.tileGap}px;
        }
        .tiles::after {
            /* Flex loosing right padding, when overflowing */
            content: '';
            min-width: ${HueDialog.haPadding - HueDialog.tileGap}px;
        }
        .heading-title {
            font-size:16px;
            vertical-align:top;
            font-weight:450;
            text-overflow:ellipsis;
            overflow:hidden;
            font:Roboto;
            white-space:nowrap;
            color:var(--hue-text-color);
            transition:all 0.3s ease-out 0s;
            margin-top: 15px;
        }
        .light-title {
            color:${unsafeCSS(Consts.LightColor)};
            font-size: 12px;
            line-height: 15px;
            font-weight:350;
            overflow:hidden;
            font:Roboto;
            transition: all 0.5s linear;
            margin-top: 10px;
            width:30%;
        }
        .light-slider {
            width:50%;
        }
        .light-switch {
            width:20%;
            margin-left:10%;
        }
        .lights {
            display: flex;
            flex-flow: row;
            margin-bottom: ${HueDialog.tileGap}px;
        }
        `];
    }

    // Can't be named 'updateStyles', because HA search for that method and calls it instead of applying theme
    private updateStylesInner(isFirst: boolean): void {
        // ## Content styles
        if (isFirst) {
            // apply theme
            applyThemesOnElement(this, this._ctrl.hass.themes, this._config.theme);

            // To help change themes on the fly
            ThemeHelper.setDialogThemeStyles(this, '--hue-screen-background');

            const configColor = this._config.getHueScreenBgColor();
            let contentBg = null;
            let contentFg = null;
            if (!configColor.isThemeColor()) {
                contentBg = configColor;
                contentFg = contentBg.getForeground(Consts.DialogFgLightColor, Consts.DarkColor, +120); // for most colors use dark

                this.style.setProperty(
                    '--hue-screen-background',
                    contentBg.toString()
                );
                this.style.setProperty(
                    '--primary-text-color',
                    contentFg.toString()
                );
            }
        }

        // ## Heading styles
        const heading = <Element>this.renderRoot.querySelector('.heading');

        let offBackground: Background | null;
        // if the user sets custom off color - use it
        if (this._config.wasOffColorSet) {
            const offColor = this._config.getOffColor();
            if (!offColor.isThemeColor()) {
                offBackground = new Background([offColor.getBaseColor()]);
            } else {
                offBackground = null;
            }
        } else {
            offBackground = new Background([new Color(Consts.DialogOffColor)]);
        }

        const bfg = ViewUtils.calculateBackAndForeground(this._ctrl, offBackground, true);
        const shadow = ViewUtils.calculateDefaultShadow(heading, this._ctrl, this._config);

        // when first rendered, clientHeight is 0, so no shadow is genered - plan new update:
        if (!shadow) {
            this.requestUpdate();
        }

        if (this._config.hueBorders) {
            this.style.setProperty(
                '--ha-dialog-border-radius',
                Consts.HueBorderRadius + 'px'
            );
        }

        this.style.setProperty(
            '--hue-background',
            bfg.background?.toString() ?? Consts.ThemeCardBackgroundVar
        );
        this.style.setProperty(
            '--hue-box-shadow',
            shadow
        );

        if (bfg.foreground != null) {
            this.style.setProperty(
                '--hue-text-color',
                bfg.foreground.toString()
            );
        } else {
            this.style.removeProperty('--hue-text-color');
        }
    }

    protected render() {
        this._isRendered = true;

        // inspiration: https://github.com/home-assistant/frontend/blob/dev/src/dialogs/more-info/ha-more-info-dialog.ts

        const cardTitle = this._config.getTitle(this._ctrl).resolveToString(this._ctrl.hass);
        const mdiClose = 'mdi:arrow-left';

        const onChangeCallback = () => {
            this.requestUpdate();
            this.updateStylesInner(false);
        };      

        /*eslint-disable */
        return html`
        <ha-dialog
          open
          @closed=${this.onDialogClose}
          .heading=${cardTitle}
          hideActions
        >
          <div slot="heading" class="heading">
            <ha-header-bar>
              <ha-icon-button
                slot="navigationIcon"
                dialogAction="cancel"
              >
                <ha-icon
                  icon=${mdiClose}
                  style="height:20px"
                >
                </ha-icon>
              </ha-icon-button>
              <div
                slot="title"
                class="main-title heading-title"
                .title=${cardTitle}
              >
                ${cardTitle}
              </div>
              <div slot="actionItems">
              ${ViewUtils.createSwitch(this._ctrl, onChangeCallback)}
              </div>
            </ha-header-bar>
            ${ViewUtils.createSlider(this._ctrl, this._config, onChangeCallback)}
          </div>
          <div class="content" tabindex="-1" dialogInitialFocus>
            ${cache(
            this._currTab === HueDialog.scenesTab
                ? html`
                    <div class='header'>
                        <div class='title'>${this._config.resources.scenes}</div>
                    </div>
                    <div class='tile-scroller'>
                        <div class='tiles'>
                            ${(this._config.scenes.map((s, i) => i % 2 == 1 ? html`` : html`<${unsafeStatic(HueDialogTile.ElementName)} .cardTitle=${cardTitle} .sceneConfig=${s} .hass=${this._ctrl.hass}></${unsafeStatic(HueDialogTile.ElementName)}>`))}
                        </div>
                        <div class='tiles'>
                            ${(this._config.scenes.map((s, i) => i % 2 == 0 ? html`` : html`<${unsafeStatic(HueDialogTile.ElementName)} .cardTitle=${cardTitle} .sceneConfig=${s} .hass=${this._ctrl.hass}></${unsafeStatic(HueDialogTile.ElementName)}>`))}
                        </div>
                    </div>
                    <div class='header'>
                        <div class='title'>${this._config.resources.lights}</div>
                    </div>
                    <div class='entity-scroller'>
                        <div class='lightEntites'>
                            ${(this._config.entities!.map( x => GlobalLights.getLightContainer(x) ).map( s =>
                            html`
                            <div class="lights">
                            <div class="light-title">${s.getTitle()}</div>
                            <div class="light-slider"> ${ViewUtils.createSlider( LightController.LightController( [s.getEntityId()], this._config, this._ctrl.hass ), this._config, onChangeCallback)} </div>
                            <div class="light-switch"> ${ViewUtils.createSwitch( LightController.LightController( [s.getEntityId()], this._config, this._ctrl.hass ), onChangeCallback)} </div>
                            </div>                            
                            ` ))}
                        </div>
                    </div>
                  `
                : html`
                    <h3>Here for Colors</h3>
                  `
        )}

          </div>
        </ha-dialog>
        `;
        /*eslint-enable */
    }

    //#region updateStyles hooks

    protected firstUpdated(changedProps: PropertyValues) {
        super.firstUpdated(changedProps);

        this.updateStylesInner(true);
    }

    protected updated(changedProps: PropertyValues) {
        super.updated(changedProps);

        this.updateStylesInner(false);
    }

    //#endregion
}
