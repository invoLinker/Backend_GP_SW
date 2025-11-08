// export class PaymentParser {
//   static parseInstallments(notes: string, totalAmount: number) {
//     if (!notes) {
//       return { total_installments: 1, installments: [{ amount: totalAmount, due_date: new Date() }] };
//     }

//     notes = notes.toLowerCase().replace(/[،\.]/g, ',');

//     // -------------------------------
//     // عدد الأقساط
//     let total_installments = 1;
//     if (/الدفع على (قسطين|دفعتين)|قسطين|دفعتين/.test(notes)) total_installments = 2;
//     else {
//       const installmentsRegex = /(\d+)\s*(?:أقساط|اقساط|قسط|دفعات|دفعة|installments?|installment?|payments?)/i;
//       const installmentsMatch = notes.match(installmentsRegex);
//       if (installmentsMatch) total_installments = parseInt(installmentsMatch[1]);
//     }

//     // -------------------------------
//     // استخراج مبالغ الأقساط
//     const amountsRegex =
//       /(?:الدفعة|قسط|installment|payment)\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|الثامنة|التاسعة|العاشرة|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)?\s*[:\-]?\s*(\d+(\.\d+)?)/gi;

//     const amounts: number[] = [];
//     let match;
//     while ((match = amountsRegex.exec(notes)) !== null) {
//       const val = match[1];
//       if (val) amounts.push(parseFloat(val.replace(/,/g, '')));
//     }

//      const dateRegex = /(\d{1,2})-(\d{1,2})-(\d{4})/g;
//     const dateMatches: Date[] = [];
//     while ((match = dateRegex.exec(notes)) !== null) {
//       const [_, day, month, year] = match;
//       dateMatches.push(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
//     }


//     // -------------------------------
//     // استخراج مدة كل دفعة (يوم، أسبوع، شهر، سنة) بالعربي + الإنجليزي
//     const durationRegex =
//       /(?:الدفعة|قسط|installment|payment)?\s*(?:الأولى|الاولى|الثانية|الثالثة|الرابعة|الخامسة|first|second|third|fourth|fifth|\d+)?\s*[:\-]?\s*(?:بعد|في|on|after|in)\s*(\d+)?\s*(يوم(?:ين)?|days?|أسبوع(?:ين)?|اسبوع|weeks?|شهر(?:ين)?|أشهر|اشهر|months?|سنة|سنه|سنين|years?|receipt|immediately)/gi;

//     const durations: { days: number; months: number; years: number }[] = [];
//     while ((match = durationRegex.exec(notes)) !== null) {
//       const num = parseInt(match[1] || '1');
//       const unit = match[2] || 'يوم';
//       let days = 0, months = 0, years = 0;

//       if (/يوم|day/.test(unit)) days = /يومين/.test(unit)  ? 2 : num;
//       else if (/أسبوع|اسبوع|week/.test(unit)) days = /أسبوعين/.test(unit)  ? 14 : num * 7;
//       else if (/شهر|أشهر|اشهر|month/.test(unit)) months = /شهرين/.test(unit)  ? 2 : num;
//       else if (/سنة|سنين|year/.test(unit)) years = /سنتين/.test(unit)  ? 2 : num;
//       if (/receipt|immediately/.test(unit)) days = 0;


//       durations.push({ days, months, years });
//     }

  

//     // -------------------------------
//     // حساب تواريخ الأقساط والمبالغ
//     const installments: { amount: number; due_date: Date }[] = [];
//     let prevDate = new Date();

//     for (let i = 0; i < total_installments; i++) {
//       let amount = i < amounts.length ? amounts[i] : totalAmount / total_installments;

//       // لو في تاريخ محدد للقسط
//       let due_date: Date;
//       if (dateMatches[i]) {
//         due_date = dateMatches[i];
//       } else {
//         const dur = durations[i - dateMatches.length] || { days: 0, months: 0, years: 0 };
//         due_date = new Date(prevDate);
//         due_date.setUTCDate(due_date.getUTCDate() + dur.days);
//         due_date.setUTCMonth(due_date.getUTCMonth() + dur.months);
//         due_date.setUTCFullYear(due_date.getUTCFullYear() + dur.years);
//       }

//       installments.push({ amount, due_date });
//       prevDate = due_date;
//     }

//     return { total_installments, installments };
//   }
// }
