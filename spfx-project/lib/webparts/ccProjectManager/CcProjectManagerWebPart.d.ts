import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart, IPropertyPaneConfiguration } from '@microsoft/sp-webpart-base';
export interface ICcProjectManagerWebPartProps {
    description: string;
}
export default class CcProjectManagerWebPart extends BaseClientSideWebPart<ICcProjectManagerWebPartProps> {
    render(): void;
    protected onDispose(): void;
    protected get dataVersion(): Version;
    protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration;
}
//# sourceMappingURL=CcProjectManagerWebPart.d.ts.map