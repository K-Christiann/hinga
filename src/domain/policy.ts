export interface PublicPolicy {
  operatorName: string; privacyEmail: string; reviewHours: string;
  backupDays: number; erasureLogDays: number; minimumAge: number;
  version: string; approved: boolean; collectionOpen: boolean;
  privateCollectionOpen: boolean; communityCollectionOpen: boolean;
}
export interface PolicyGateway { get(): Promise<PublicPolicy> }
