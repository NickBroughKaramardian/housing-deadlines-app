import { ITypingsGeneratorOptions, TypingsGenerator } from './TypingsGenerator';
/**
 * @public
 */
export interface IStringValueTyping {
    exportName: string;
    comment?: string;
}
/**
 * @public
 */
export interface IStringValueTypings {
    typings: IStringValueTyping[];
}
/**
 * @public
 */
export interface IStringValuesTypingsGeneratorOptions extends ITypingsGeneratorOptions<IStringValueTypings | undefined> {
    /**
     * Setting this option wraps the typings export in a default property.
     */
    exportAsDefault?: boolean;
    /**
     * When `exportAsDefault` is true, this optional setting determines the interface name
     * for the default wrapped export. Ignored when `exportAsDefault` is false.
     */
    exportAsDefaultInterfaceName?: string;
}
/**
 * This is a simple tool that generates .d.ts files for non-TS files that can be represented as
 * a simple set of named string exports.
 *
 * @public
 */
export declare class StringValuesTypingsGenerator extends TypingsGenerator {
    constructor(options: IStringValuesTypingsGeneratorOptions);
}
//# sourceMappingURL=StringValuesTypingsGenerator.d.ts.map