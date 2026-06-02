import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

/**
 * BullMQ processor for async prescription verification tasks.
 * Handles notification dispatch and status transitions.
 * 
 * Future enhancement: integrate OCR for automated prescription reading.
 */
@Processor('prescription-verification')
export class PrescriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(PrescriptionProcessor.name);

  async process(job: Job<{ prescriptionId: string; userId: string }>): Promise<void> {
    const { prescriptionId, userId } = job.data;

    this.logger.log(`Processing prescription verification: ${prescriptionId} for user ${userId}`);

    // Currently the processor serves as:
    // 1. A notification trigger to admins about new prescriptions
    // 2. A placeholder for future OCR processing
    // 3. An auto-flagging mechanism for suspicious uploads

    // TODO: When NotificationsService is injected:
    // - Notify admins of new prescription in queue
    // - Send user a "we received your prescription" notification

    this.logger.log(`Prescription ${prescriptionId} queued for manual review`);
  }
}
