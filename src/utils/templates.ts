export interface Template {
    id: string;
    name: string;
    content: string;
}

export const templates: Template[] = [
    {
        id: 'cornell',
        name: 'Cornell Notes',
        content: `# Topic: 
Date: 

| Cues / Questions | Notes |
| :--- | :--- |
| **Key Question 1** | - Note 1<br>- Note 2 |
| **Key Question 2** | - Note 1<br>- Note 2 |

## Summary
> Summarize the main ideas here in 2-3 sentences.
`
    },
    {
        id: 'meeting',
        name: 'Meeting Notes',
        content: `# Meeting: 
Date: 
Attendees: 

## Agenda
1. 
2. 
3. 

## Notes
- 

## Action Items
- [ ] 
- [ ] 
`
    },
    {
        id: 'weekly-plan',
        name: 'Weekly Study Plan',
        content: `# Weekly Plan: [Date Range]

## Goals
- [ ] 
- [ ] 

## Schedule
| Day | Morning | Afternoon | Evening |
| :--- | :--- | :--- | :--- |
| **Mon** | | | |
| **Tue** | | | |
| **Wed** | | | |
| **Thu** | | | |
| **Fri** | | | |
| **Sat** | | | |
| **Sun** | | | |

## Review
- What went well?
- What needs improvement?
`
    },
    {
        id: 'flashcards',
        name: 'Flashcard Set',
        content: `# Flashcards: Topic

Q: Question 1?
A: Answer 1

Q: Question 2?
A: Answer 2

---
`
    }
];
