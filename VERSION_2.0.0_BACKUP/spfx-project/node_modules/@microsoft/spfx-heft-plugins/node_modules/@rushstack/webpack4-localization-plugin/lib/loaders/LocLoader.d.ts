import { loader } from 'webpack';
import { LocalizationPlugin } from '../LocalizationPlugin';
import { IBaseLoaderOptions } from './LoaderFactory';
export interface ILocLoaderOptions extends IBaseLoaderOptions {
    pluginInstance: LocalizationPlugin;
}
declare const _default: loader.Loader;
export default _default;
//# sourceMappingURL=LocLoader.d.ts.map