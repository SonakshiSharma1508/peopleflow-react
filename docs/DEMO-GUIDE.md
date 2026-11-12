# PeopleFlow React demo walkthrough

This is a fictional frontend demo. Use the application and explain the behavior in your own words. Task completion records work; it does not perform external account, payroll, or notification operations.

## Prepare

Run `npm run dev` from the project folder and open the printed address. Start with Demo role set to HR. If you need the fresh stories, use **Workspace settings → Reset demo** and confirm. Reset replaces current React-demo changes. Export first if you want an inspection copy; there is no automatic import/restore.

Fresh sample dates are relative to the day reset creates them. Saved dates do not keep moving, so do not promise an old screenshot's exact overdue count.

## A three to four minute story

### Show the workspace

On Overview, point to the open journeys, attention items, and recent activity. Explain that the cards are calculations from employee/task records rather than separate counters.

### Show Omar's dependency

Open **People**, search **Omar**, and open **Omar Hassan, EMP-1045**. As HR, point to the blocked **Provision work accounts** task. Complete **Verify employment documents**. Switch Demo role to IT and complete **Provision work accounts**.

Explain: a prerequisite and a task's owner both affect availability. The role dropdown demonstrates responsibilities, not authentication. The task row is a React component; its action goes through shared state and the domain function.

For a longer onboarding demonstration, also complete the employee record as HR, assign a fictional laptop as IT before equipment preparation, complete orientation and the first-month plan as Manager, then finish onboarding as HR. The buddy introduction is optional. Orientation requires the employee record and accounts, not the equipment task.

### Show Maya's equipment gate

Use **Find anything** to open **Maya Chen, EMP-1021**. Stay in IT. In the fresh sample her exit confirmation and handover are already complete, her access card is returned, and her laptop remains outstanding.

1. Point to blocked **Confirm equipment returned**.
2. Under Assigned equipment, mark the laptop returned.
3. Complete **Confirm equipment returned** and **Revoke work account access**.
4. Switch to HR and complete **Record final settlement review**.
5. Choose **Complete exit**.

Maya becomes Departed, her checklist becomes read-only, and its tasks leave the live queue. The optional exit interview need not block closure.

### Show Noah's final HR action

Open **Noah Wilson, EMP-1041**, as HR and choose **Complete onboarding**. His fresh checklist is already complete. He becomes Active. Explain that finished tasks and explicit journey closure are separate decisions.

### Show history and persistence

Open Activity and inspect the recorded workflow changes. Refresh the same application address to show that successful browser saves persist. Explain the local-data boundary: another browser/profile/device does not share this snapshot.

## A short project introduction

“PeopleFlow is a React frontend portfolio project for employee onboarding and offboarding. It coordinates tasks across HR, IT, and managers, including prerequisites, equipment requirements, and journey closure. It uses JavaScript, JSX, plain CSS, React Router, and Vite. Context and a reducer provide shared state, while reusable domain functions enforce the demo's rules. This release uses fictional data saved in the browser; real authentication and collaborative storage are later work.”

Use claims you can explain and demonstrate. Describe AI assistance truthfully and show changes or tests you have personally worked through rather than claiming independent authorship of generated code.
