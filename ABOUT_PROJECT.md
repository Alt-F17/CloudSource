## Inspiration

CloudSource AI Travel Planner came from a frustration with how fragmented travel planning usually feels. Booking flights happens in one place, researching culture in another, budgeting somewhere else, and keeping track of ideas in scattered notes. We wanted to build a planner that treats a trip as one connected experience instead of a pile of separate tasks. The globe-first interface was inspired by the idea that travel is fundamentally spatial: you are not just filling out forms, you are moving through the world.

## What it does

CloudSource is an interactive travel planning app centered around a 3D globe. Users can choose a destination, explore it visually, and navigate through an orbiting set of planning panels for flights, hotels, budget, culture, notes, chat, and trip tasks. The app can generate a structured trip plan with AI, including itinerary notes, practical tips, and to-dos. It also includes a lightweight assistant, Nimbus, to help guide the user through planning decisions and keep everything tied to the same trip context.

## How we built it

We built CloudSource with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and Cesium. The frontend uses a globe-centered layout with animated carousel navigation, while shared app state keeps trip data, notes, todos, budgets, and flight selections synchronized across the experience. On the backend side, we created API routes for AI-powered trip generation and flight search. The AI route produces structured JSON for trips, notes, and tasks, which lets the app map generated output directly into the interface. Conceptually, we were trying to reduce travel-planning friction:

$$
f \approx c + o + d
$$

where \(c\) is context switching, \(o\) is information overload, and \(d\) is decision fatigue.

## Challenges we ran into

The hardest part was combining several ambitious ideas into one coherent product. A 3D globe, animated orbiting UI, AI-generated content, and multiple planning tools can easily feel disconnected if the state model is weak. We also had to deal with the practical challenge of making AI output reliable enough to fit a strict schema, since inconsistent output would immediately break the user experience. Another challenge was balancing visual ambition with usability so the interface felt distinctive without becoming confusing.

## Accomplishments that we're proud of

We are proud that CloudSource feels like a unified product rather than a collection of unrelated features. The globe is not just decorative; it acts as the center of the experience and ties the planning tools together. We are also proud of building a working flow where AI-generated trip data feeds directly into notes, todos, and destination context. Most importantly, we turned a high-concept interface into a functional full-stack prototype within hackathon constraints.

## What we learned

We learned that product design and engineering decisions are deeply linked. A strong visual idea only works if the underlying data flow is solid, and a technically capable app still fails if the experience feels fragmented. We also learned a lot about state management in a multi-panel React app, about structuring AI outputs so they are usable in production-like flows, and about building around a single interaction metaphor instead of adding features without a unifying model.

## What's next for CloudSource AI Travel Planner

The next step is to make CloudSource more real-time and personalized. That means replacing mocked travel data with live flight and hotel integrations, improving the AI assistant so it can make smarter itinerary adjustments, and expanding destination intelligence with deeper cultural, transit, and budgeting insights. We also want to support collaboration, so groups can plan trips together, compare options, and manage shared decisions in one place.
