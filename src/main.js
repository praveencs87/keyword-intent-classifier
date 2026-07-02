import { Actor, log } from 'apify';

await Actor.init();

try {
    const input = await Actor.getInput();
    const { keywords } = input;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('An array of keywords is required!');
    }

    log.info(`Starting Keyword Intent Classifier for ${keywords.length} keywords.`);

    // PPE: Base charge for starting
    await Actor.charge({ eventName: 'apify-actor-start', count: 1 });

    const rules = {
        transactional: /\b(buy|cheap|price|pricing|discount|coupon|promo|order|purchase|hire|cost|for sale|deal|hire|services|freelance|agency)\b/i,
        informational: /\b(how|what|why|when|where|who|guide|tutorial|ideas|tips|example|meaning|learn|history|definition|vs|versus|difference)\b/i,
        local: /\b(near me|nearby|in |location|hours|open|directions|dentist|plumber|electrician|repair|restaurant|hotel|store|clinic)\b/i,
        navigational: /\b(login|sign in|sign up|register|portal|app|download|facebook|youtube|google|netflix|amazon)\b/i
    };

    let classifiedCount = 0;

    for (const keyword of keywords) {
        const lowerKw = keyword.toLowerCase().trim();
        const matches = [];

        if (rules.transactional.test(lowerKw)) matches.push('Transactional');
        if (rules.local.test(lowerKw)) matches.push('Local');
        if (rules.informational.test(lowerKw)) matches.push('Informational');
        if (rules.navigational.test(lowerKw)) matches.push('Navigational');

        let primary_intent = 'Commercial Investigation'; // Default if none match perfectly
        let secondary_intent = null;
        let confidence = 'Low';

        if (matches.length > 0) {
            primary_intent = matches[0];
            confidence = matches.length === 1 ? 'High' : 'Medium';
            if (matches.length > 1) {
                secondary_intent = matches[1];
            }
        }

        const record = {
            keyword,
            primary_intent,
            secondary_intent,
            confidence,
            matched_rules: matches.join(', ') || 'None'
        };

        await Actor.pushData(record);
        
        // PPE: Charge per keyword classified
        await Actor.charge({ eventName: 'keyword-classified', count: 1 });
        
        classifiedCount++;
    }

    log.info(`🎉 Successfully classified ${classifiedCount} keywords in milliseconds!`);
} catch (error) {
    console.error('CRASH:', error);
    throw error;
} finally {
    await Actor.exit();
}
