export interface ShareToken {
  id: string;
  fileId: string;
  createdBy: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface ShareTokenWithFile extends ShareToken {
  fileName: string;
}
