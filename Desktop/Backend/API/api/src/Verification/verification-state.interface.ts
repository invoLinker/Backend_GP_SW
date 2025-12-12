// /**
//  * Verification State Interface
//  * Tracks the current state of verification to allow resuming from a specific stage
//  */

// export interface StageResult {
//   stage: number;
//   pass: boolean;
//   notes: string[];
// }

// export interface VerificationState {
//   po_number: string;
//   verificationType: 'invoice' | 'delivery_note' | 'goods_receipt' | 'completed'; // Current verification type
//   currentStage: number;           // Current stage (1-4 for invoices, 1-2 for DN/GR)
//   completedStages: StageResult[]; // Stages that have been completed
//   stopped: boolean;                // Whether verification was stopped
//   requiresUserDecision: boolean;  // Whether waiting for user decision
//   error?: {
//     stage: number;
//     message: string;
//   };
// }

// export interface UnifiedVerificationResponse {
//   success: boolean;
//   stopped: boolean;
//   requiresUserDecision: boolean;
//   currentVerification: 'invoice' | 'delivery_note' | 'goods_receipt' | 'completed';
//   currentStage: number;
  
//   // Results from each verification type
//   invoiceResults?: StageResult[];
//   deliveryNoteResults?: StageResult[];
//   goodsReceiptResults?: StageResult[];
  
//   // All errors aggregated
//   allErrors: {
//     verificationType: 'invoice' | 'delivery_note' | 'goods_receipt';
//     stage: number;
//     message: string;
//     details: string[];
//   }[];
  
//   // Final status
//   finalStatus?: {
//     allPassed: boolean;
//     invoicesVerified: boolean;
//     deliveryNotesVerified: boolean;
//     goodsReceiptsVerified: boolean;
//     status: 'Verified' | 'Rejected' | 'Partial';
//     readyForPayment: boolean;
//   };
  
//   message: string;
//   canContinue: boolean;
// }

// export interface VerificationResponse {
//   success: boolean;
//   stopped: boolean;
//   requiresUserDecision: boolean;
//   currentStage: number;
//   completedStages: StageResult[];
//   error?: {
//     stage: number;
//     message: string;
//     details: string[];
//   };
//   message: string;  // User-friendly message
//   canContinue: boolean;  // Whether user can continue to next stage
// }

