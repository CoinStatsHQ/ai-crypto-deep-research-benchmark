const JUDGMENT_RESPONSE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['verdict', 'overall_score', 'summary', 'criteria'],
    properties: {
        verdict: {
            type: 'string',
            enum: ['pass', 'borderline', 'fail']
        },
        overall_score: {
            type: 'number'
        },
        summary: {
            type: 'string'
        },
        criteria: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'score', 'max_score', 'reasoning'],
                properties: {
                    name: {
                        type: 'string'
                    },
                    score: {
                        type: 'number'
                    },
                    max_score: {
                        type: 'number'
                    },
                    reasoning: {
                        type: 'string'
                    }
                }
            }
        }
    }
};

module.exports = {
    JUDGMENT_RESPONSE_SCHEMA
};
