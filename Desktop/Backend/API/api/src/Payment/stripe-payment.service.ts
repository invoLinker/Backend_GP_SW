
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


  async createPaymentIntent(amount: number, currency: string) {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
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
