import { Source } from 'webpack-sources';
import { IAssetInfo, IModuleMap } from './ModuleMinifierPlugin.types';
/**
 * Rehydrates an asset with minified modules.
 * @param asset - The asset
 * @param moduleMap - The minified modules
 * @param banner - A banner to inject for license information
 * @public
 */
export declare function rehydrateAsset(asset: IAssetInfo, moduleMap: IModuleMap, banner: string): Source;
//# sourceMappingURL=RehydrateAsset.d.ts.map