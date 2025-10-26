// export class PaymentParser {
//   static parseInstallments(notes: string, totalAmount: number) {
//     if (!notes) {
//       return { total_installments: 1, installments: [{ amount: totalAmount, due_date: new Date() }] };
//     }

//     notes = notes.toLowerCase().replace(/[،\.]/g, ',');

//     // -------------------------------
//     // عدد الأقساط
//     let total_installments = 1;
//     if (/قسطين/.test(notes)) total_installments = 2;
//     else {
//       const installmentsRegex = /(\d+)\s*(?:أقساط|اقساط|قسط|دفعات|دفعة|installments?|installment?|payments?)/i;
//       const installmentsMatch = notes.match(installmentsRegex);
//       if (installmentsMatch) total_installments = parseInt(installmentsMatch[1]);
//     }

//     // -------------------------------
//     // استخراج مبالغ الأقساط
//     const amountsRegex =
//       /(?:الدفعة|قسط|installment|payment)\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)?\s*[:\-]?\s*([\d,.]+)/gi;

//     const amounts: number[] = [];
//     let match;
//     while ((match = amountsRegex.exec(notes)) !== null) {
//       const val = match[1];
//       if (val) amounts.push(parseFloat(val.replace(/,/g, '')));
//     }

//     // -------------------------------
//     // استخراج مدة كل دفعة (يوم، أسبوع، شهر، سنة)
//     const durationRegex =
//       /(?:الدفعة|قسط|installment|payment)?\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|first|second|third|fourth|fifth|\d+)?\s*[:\-]?\s*(?:بعد|في|on|after)\s*(\d+)?\s*(يوم(?:ين)?|اسبوع|أسبوع(?:ين)?|اشهر|أشهر|شهر(?:ين)?|سنة|سنه|سنين)?/gi;

//     const durations: { days: number; months: number; years: number }[] = [];
//     while ((match = durationRegex.exec(notes)) !== null) {
//       const num = parseInt(match[1] || '1');
//       const unit = match[2] || 'يوم';
//       let days = 0, months = 0, years = 0;

//       if (/يوم/.test(unit)) days = /يومين/.test(unit) ? 2 : num;
//       else if (/أسبوع/.test(unit)) days = /أسبوعين/.test(unit) ? 14 : num * 7;
//       else if (/شهر/.test(unit)) months = /شهرين/.test(unit) ? 2 : num;
//       else if (/سنة|سنين/.test(unit)) years = /سنتين|سنين/.test(unit) ? 2 : num;

//       durations.push({ days, months, years });
//     }

//     // -------------------------------
//     // حساب تواريخ الأقساط والمبالغ
//     const installments: { amount: number; due_date: Date }[] = [];
//     let prevDate = new Date();

//     for (let i = 0; i < total_installments; i++) {
//       // المبلغ: الدفعة المحددة أو نصيب القسط الباقي
//       let amount: number;
//       if (i < amounts.length) {
//         amount = amounts[i];
//       } else {
//         const remainingInstallments = total_installments - i;
//         const paidAmount = installments.reduce((a, b) => a + b.amount, 0);
//         const remainingAmount = totalAmount - paidAmount;
//         amount = remainingAmount / remainingInstallments;
//       }

//       // مدة الدفعة
//       const dur = durations[i] || { days: 0, months: 0, years: 0 };
//       const due_date = new Date(prevDate);
//       due_date.setDate(due_date.getDate() + dur.days);
//       due_date.setMonth(due_date.getMonth() + dur.months);
//       due_date.setFullYear(due_date.getFullYear() + dur.years);

//       installments.push({ amount, due_date });
//       prevDate = due_date; // الدفعة التالية تعتمد على هذه
//     }

//     return { total_installments, installments };
//   }
// }


// جاهز للعربي الي فوق

export class PaymentParser {
  static parseInstallments(notes: string, totalAmount: number) {
    if (!notes) {
      return { total_installments: 1, installments: [{ amount: totalAmount, due_date: new Date() }] };
    }

    notes = notes.toLowerCase().replace(/[،\.]/g, ',');

    // -------------------------------
    // عدد الأقساط
    let total_installments = 1;
    if (/قسطين/.test(notes)) total_installments = 2;
    else {
      const installmentsRegex = /(\d+)\s*(?:أقساط|اقساط|قسط|دفعات|دفعة|installments?|installment?|payments?)/i;
      const installmentsMatch = notes.match(installmentsRegex);
      if (installmentsMatch) total_installments = parseInt(installmentsMatch[1]);
    }

    // -------------------------------
    // استخراج مبالغ الأقساط
    const amountsRegex =
      /(?:الدفعة|قسط|installment|payment)\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)?\s*[:\-]?\s*(\d+(\.\d+)?)/gi;

    const amounts: number[] = [];
    let match;
    while ((match = amountsRegex.exec(notes)) !== null) {
      const val = match[1];
      if (val) amounts.push(parseFloat(val.replace(/,/g, '')));
    }

    // -------------------------------
    // استخراج مدة كل دفعة (يوم، أسبوع، شهر، سنة) بالعربي + الإنجليزي
    const durationRegex =
      /(?:الدفعة|قسط|installment|payment)?\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|first|second|third|fourth|fifth|\d+)?\s*[:\-]?\s*(?:بعد|في|on|after)\s*(\d+)?\s*(يوم(?:ين)?|days?|أسبوع(?:ين)?|اسبوع|weeks?|شهر(?:ين)?|أشهر|اشهر|months?|سنة|سنه|سنين|years?)/gi;

    const durations: { days: number; months: number; years: number }[] = [];
    while ((match = durationRegex.exec(notes)) !== null) {
      const num = parseInt(match[1] || '1');
      const unit = match[2] || 'يوم';
      let days = 0, months = 0, years = 0;

      if (/يوم|day/.test(unit)) days = /يومين/.test(unit)  ? 2 : num;
      else if (/أسبوع|اسبوع|week/.test(unit)) days = /أسبوعين/.test(unit)  ? 14 : num * 7;
      else if (/شهر|أشهر|اشهر|month/.test(unit)) months = /شهرين/.test(unit)  ? 2 : num;
      else if (/سنة|سنين|year/.test(unit)) years = /سنتين/.test(unit)  ? 2 : num;

      durations.push({ days, months, years });
    }

    // -------------------------------
    // حساب تواريخ الأقساط والمبالغ
    const installments: { amount: number; due_date: Date }[] = [];
    let prevDate = new Date();

    for (let i = 0; i < total_installments; i++) {
      // المبلغ: الدفعة المحددة أو نصيب القسط الباقي
      let amount: number;
      if (i < amounts.length) {
        amount = amounts[i];
      } else {
        const remainingInstallments = total_installments - i;
        const paidAmount = installments.reduce((a, b) => a + b.amount, 0);
        const remainingAmount = totalAmount - paidAmount;
        amount = remainingAmount / remainingInstallments;
      }

      // مدة الدفعة
      const dur = durations[i] || { days: 0, months: 0, years: 0 };
      const due_date = new Date(prevDate);
      due_date.setDate(due_date.getDate() + dur.days);
      due_date.setMonth(due_date.getMonth() + dur.months);
      due_date.setFullYear(due_date.getFullYear() + dur.years);

      installments.push({ amount, due_date });
      prevDate = due_date; // الدفعة التالية تعتمد على هذه
    }

    return { total_installments, installments };
  }
}
