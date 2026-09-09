import { mcq } from './helpers.js';

export const theory = [
  mcq('sla-t01', 'task_sla', 'Runtime SLA instances on a task are stored in:', ['contract_sla', 'task_sla', 'sys_user', 'cmn_schedule'], 1, 'contract_sla (or SLA definition) is the definition; task_sla is the running instance.', 'easy'),
  mcq('sla-t02', 'has_breached', 'has_breached = true means:', ['The SLA definition is inactive', 'The SLA instance missed its target', 'The task is on hold', 'Priority is 1'], 1, 'Breach flag on the task_sla record.', 'easy'),
  mcq('sla-t03', 'made_sla', 'incident.made_sla is typically:', ['A journal field', 'A boolean whether the task met its SLA(s)', 'The SLA duration string', 'The schedule sys_id'], 1, 'Set from whether any related SLA breached, depending on design.', 'easy'),
  mcq('sla-t04', 'Pause conditions', 'SLA pause (for example On Hold) is configured so that:', ['The task is deleted', 'Elapsed SLA time stops while the pause condition is true', 'Priority becomes 5', 'CMDB relationships drop'], 1, 'Pause conditions freeze the clock.', 'intermediate'),
  mcq('sla-t05', 'On Hold state', 'Incident state 3 is commonly:', ['New', 'On Hold', 'Closed', 'Canceled'], 1, 'On Hold is often 3; confirm on your instance.', 'easy'),
  mcq('sla-t06', 'GlideDuration', 'GlideDuration is used for:', ['HTTP calls', 'Duration values such as SLA business elapsed displays', 'CI identification', 'Approvals'], 1, 'Wraps duration/ms for day-hour-minute formatting.', 'easy'),
  mcq('sla-t07', 'Escalate on breach', 'A BR on task_sla that sets incident.escalation on breach is an example of:', ['Client GlideAjax only', 'Process automation from SLA runtime to the task', 'Discovery', 'Import set coalesce'], 1, 'Bridge SLA instance to the parent task.', 'intermediate'),
  mcq('sla-t08', 'percentage', 'task_sla.percentage typically represents:', ['Percent of similar incidents', 'How much of the SLA target time has been consumed', 'CPU of the node', 'Knowledge helpful percent'], 1, 'Elapsed vs target.', 'easy'),
  mcq('sla-t09', 'Cancel SLAs', 'Setting task_sla.stage to cancelled is used when:', ['A new incident is opened', 'The task is cancelled or SLAs should stop', 'A user opens the form', 'A REST GET succeeds'], 1, 'Stop clocks when the process ends abnormally.', 'intermediate'),
  mcq('sla-t10', 'contract_sla', 'contract_sla (SLA definition) contains:', ['Each running clock for every incident', 'The definition (duration, conditions, schedule) used to attach SLAs', 'Only email body', 'CI relations'], 1, 'Definitions vs instances.', 'easy'),
  mcq('sla-t11', 'Events', 'sla.breached is typically queued to:', ['Start discovery', 'Notify or run scripts when an SLA breaches', 'Publish a KB article', 'Create a standard change'], 1, 'Notifications hook the event.', 'easy'),
  mcq('sla-t12', 'Reopen', 'Reopening a resolved incident can:', ['Never affect SLAs', 'Require SLA repair/reset depending on configuration', 'Delete the CMDB', 'Approve all changes'], 1, 'Reopen often needs SLA rebuild — not only a state flip.', 'intermediate'),
  mcq('sla-t13', 'hold_reason', 'Making hold_reason mandatory in On Hold is:', ['A CMDB identification rule', 'A data quality / process client or UI policy', 'A REST verb', 'An IRE source'], 1, 'Capture why the clock should pause.', 'easy'),
  mcq('sla-t14', 'planned_end_time', 'planned_end_time on task_sla is:', ['When the incident was opened', 'The calculated SLA due time', 'The CAB date', 'Warranty expiration'], 1, 'Target breach time.', 'easy'),
  mcq('sla-t15', 'GlideDateTime compareTo', 'now.compareTo(due) > 0 means:', ['now is before due', 'now is after due (breached if due was the target)', 'The values are equal', 'Invalid dates'], 1, 'Positive compareTo means later than the argument.', 'intermediate'),
];
