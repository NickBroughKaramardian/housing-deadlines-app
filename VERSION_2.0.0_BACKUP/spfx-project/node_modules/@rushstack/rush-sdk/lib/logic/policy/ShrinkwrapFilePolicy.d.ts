import { RushConfiguration } from '../../api/RushConfiguration';
import { IPolicyValidatorOptions } from './PolicyValidator';
import { RepoStateFile } from '../RepoStateFile';
export interface IShrinkwrapFilePolicyValidatorOptions extends IPolicyValidatorOptions {
    repoState: RepoStateFile;
}
/**
 *  A policy that validates shrinkwrap files used by package managers.
 */
export declare class ShrinkwrapFilePolicy {
    static validate(rushConfiguration: RushConfiguration, options: IPolicyValidatorOptions): void;
}
//# sourceMappingURL=ShrinkwrapFilePolicy.d.ts.map