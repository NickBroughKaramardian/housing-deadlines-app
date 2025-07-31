import { RushConfiguration } from '../../api/RushConfiguration';
export interface IPolicyValidatorOptions {
    bypassPolicy?: boolean;
    allowShrinkwrapUpdates?: boolean;
    shrinkwrapVariant?: string;
}
export declare class PolicyValidator {
    static validatePolicy(rushConfiguration: RushConfiguration, options: IPolicyValidatorOptions): void;
}
//# sourceMappingURL=PolicyValidator.d.ts.map