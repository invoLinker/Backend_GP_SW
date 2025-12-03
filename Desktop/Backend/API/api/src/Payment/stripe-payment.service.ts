// import { Injectable } from '@nestjs/common';
// import Stripe from 'stripe';

// @Injectable()
// export class StripePaymentService {
//   private stripe: Stripe;

//   constructor() {
//   this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
//     typescript: true,
//   });
// }


//   // نستعملها لعمل دفع مباشر بسيط (test)
//   async charge(amount: number, currency: string) {
//     try {
//       const intent = await this.stripe.paymentIntents.create({
//         amount: Math.round(amount * 100), // Stripe يستعمل أصغر وحدة (سنت)
//         currency: currency.toLowerCase(),
//         // ⚠️ في الإنتاج لازم تجي بيانات الكرت من الواجهة
//         payment_method: 'pm_card_visa', // test card
//         confirm: true,
//       });

//       const success = intent.status === 'succeeded';

//       return {
//         success,
//         payment_intent_id: intent.id,
//       };
//     } catch (error: any) {
//       return {
//         success: false,
//         error: error.message || 'Stripe error',
//       };
//     }
//   }
// }



import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentService {
  private stripe: Stripe;

  constructor() {
  this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    typescript: true,
  });
    }

  /**
   * Create Stripe Payment Intent
   */
  async createPaymentIntent(amount: number, currency: string) {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // تحويل المبلغ إلى cents
        currency,
        payment_method_types: ['card'],
      });

      return {
        success: true,
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Stripe Payment Intent failed: ${error.message}`,
      );
    }
  }

  /**
   * Retrieve payment intent by ID
   */
  async fetchPaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch Stripe payment: ${error.message}`,
      );
    }
  }
}
