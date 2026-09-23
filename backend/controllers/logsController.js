const db = require('../db');

const stripEmojis = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    return val
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}])/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(stripEmojis);
  }
  if (typeof val === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      cleaned[k] = stripEmojis(v);
    }
    return cleaned;
  }
  return val;
};

async function recordLog(userId, action, details = null) {
  if (!action || !userId) return;
  try {
    const cleanAction = stripEmojis(action).slice(0, 100);
    const cleanDetails = stripEmojis(details);
    const detailsStr = cleanDetails && typeof cleanDetails === 'object'
      ? JSON.stringify(cleanDetails)
      : cleanDetails ? String(cleanDetails) : null;

    await db.query(
      'INSERT INTO logs (UserID, Action, Details) VALUES (?, ?, ?)',
      [userId, cleanAction, detailsStr ? String(detailsStr).slice(0, 5000) : null]
    );
  } catch (err) {
    console.error('recordLog insert failed:', err.message);
  }
}

exports.stripEmojis = stripEmojis;
exports.recordLog = recordLog;

exports.getLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 8), 100);
    const offset = (page - 1) * limit;
    const includeHttp = String(req.query.includeHttp || '').trim() === '1';

    let statsSql = `SELECT 
        COUNT(*) as total,
        SUM(CASE 
          WHEN l.Action ILIKE '%create%' 
            OR l.Action ILIKE '%add%' 
            OR l.Action ILIKE '%insert%'
            OR l.Action ILIKE '%register%'
            OR l.Action ~* '^POST\\s+'
          THEN 1 ELSE 0 
        END) as created,
        SUM(CASE 
          WHEN l.Action ILIKE '%update%' 
            OR l.Action ILIKE '%edit%' 
            OR l.Action ILIKE '%modify%' 
            OR l.Action ILIKE '%assign%'
            OR l.Action ILIKE '%change%'
            OR l.Action ~* '^(PUT|PATCH)\\s+'
          THEN 1 ELSE 0 
        END) as updated,
        SUM(CASE 
          WHEN l.Action ILIKE '%delete%' 
            OR l.Action ILIKE '%remove%' 
            OR l.Action ILIKE '%destroy%'
            OR l.Action ~* '^DELETE\\s+'
          THEN 1 ELSE 0 
        END) as deleted,
        SUM(CASE 
          WHEN l.Action ILIKE '%login%' 
            OR l.Action ILIKE '%logout%' 
            OR l.Action ILIKE '%auth%'
            OR l.Action ILIKE '%password%'
          THEN 1 ELSE 0 
        END) as auth
      FROM logs l`;
    if (!includeHttp) {
      statsSql += ` WHERE l.Action !~ '^(GET|POST|PUT|PATCH|DELETE)\\s+'`;
    }
    const [statsRows] = await db.query(statsSql);
    const statsResult = statsRows[0] || {};
    const totalCount = parseInt(statsResult.total || 0, 10);
    const createdCount = parseInt(statsResult.created || 0, 10);
    const updatedCount = parseInt(statsResult.updated || 0, 10);
    const deletedCount = parseInt(statsResult.deleted || 0, 10);
    const authCount = parseInt(statsResult.auth || 0, 10);
    const stats = {
      total: totalCount,
      created: createdCount,
      updated: updatedCount,
      deleted: deletedCount,
      auth: authCount,
      deletedAndAuth: deletedCount + authCount
    };
    const totalPages = Math.ceil(totalCount / limit) || 1;

    let sql = `SELECT
        l.LogID,
        l.UserID,
        l.Action,
        (l.Timestamp AT TIME ZONE 'UTC') AS Timestamp,
        l.Details,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        u.RoleID,
        r.RoleName
      FROM logs l
      LEFT JOIN users u ON l.UserID = u.UserID
      LEFT JOIN roles r ON u.RoleID = r.RoleID`;

    // By default exclude low-value HTTP middleware logs like "POST /api/..." so the feed remains readable
    if (!includeHttp) {
      sql += ` WHERE l.Action !~ '^(GET|POST|PUT|PATCH|DELETE)\\s+'`;
    }

    sql += ` ORDER BY l.Timestamp DESC, l.LogID DESC LIMIT ? OFFSET ?`;

    const [rows] = await db.query(sql, [limit, offset]);

    const logs = rows.map((row) => {
      const mid = row.MiddleInitial ? ` ${row.MiddleInitial}.` : '';
      let displayName = `${row.FirstName || ''}${mid} ${row.LastName || ''}`.replace(/\s+/g, ' ').trim();
      if (!displayName) displayName = row.Email || `Deleted user #${row.UserID}`;
      const actorKind = row.RoleID === 1 ? 'Admin' : 'User';
      // Parse Details JSON when possible and build a short summary for UI
      let detailsSummary = null;
      let detailsParsed = null;
      try {
        if (row.Details) {
          detailsParsed = JSON.parse(row.Details);
          // If middleware style {status:..., body: {...}}
          const body = detailsParsed.body || detailsParsed;
          if (body) {
            // Common shapes: copy, add, update, delete
            if (body.newEventName || body.newEventCode || body.sourceEventId) {
              const src = body.sourceEventId || body.sourceEventID || '';
              const name = body.newEventName || body.EventName || '';
              detailsSummary = src ? `Copied event ${src} -> ${name}` : `${name}`;
            } else if (body.RequirementID || body.RequirementCode) {
              detailsSummary = `Requirement ${body.RequirementCode || body.RequirementID}`;
            } else if (body.CriteriaID || body.CriteriaCode) {
              detailsSummary = `Criteria ${body.CriteriaCode || body.CriteriaID}`;
            } else if (body.areaids || body.areaIds || body.deletedCount) {
              detailsSummary = `Deleted areas: ${body.areaids || body.areaIds || body.deletedCount}`;
            } else if (typeof body === 'object') {
              // fallback: show keys and small values
              const keys = Object.keys(body).slice(0, 6);
              const pairs = keys.map(k => {
                const v = body[k];
                if (v === null || v === undefined) return `${k}: null`;
                if (typeof v === 'object') return `${k}: {…}`;
                const s = String(v);
                return `${k}: ${s.length > 30 ? s.slice(0, 27) + '…' : s}`;
              });
              detailsSummary = pairs.join(' | ');
            }
          }
        }
      } catch (e) {
        detailsSummary = null;
        detailsParsed = null;
      }

      // Build a friendly message preferring semantic controller actions
      let message = null;
      const action = String(row.Action || '').trim();
      const body = detailsParsed && detailsParsed.body ? detailsParsed.body : detailsParsed;

      const prettifyFieldName = (field) => {
        const aliases = {
          EventName: 'Name',
          EventCode: 'Code',
          CriteriaName: 'Name',
          CriteriaCode: 'Code',
          AreaName: 'Name',
          AreaCode: 'Code',
          RequirementCode: 'Code',
          OfficeName: 'Name',
          Description: 'Description',
          EventID: 'Event',
          CriteriaID: 'Criteria',
          AreaID: 'Area',
          OfficeTypeID: 'Office Type',
          ParentCriteriaID: 'Parent Criteria',
          ParentRequirementCode: 'Parent Requirement',
          ParentRequirementID: 'Parent Requirement ID',
          HeadIDs: 'Office Heads',
          Email: 'Email',
          FirstName: 'First Name',
          LastName: 'Last Name',
          MiddleInitial: 'Middle Initial',
          RoleID: 'Role'
        };
        if (aliases[field]) return aliases[field];
        return String(field || '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();
      };

      const formatChangeValue = (value) => {
        if (value === null || value === undefined || value === '') return '(empty)';
        if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
        if (typeof value === 'object') return '{...}';
        const text = String(value);
        return text.length > 60 ? `${text.slice(0, 57)}...` : text;
      };

      const formatChangesList = (changes) => {
        if (!changes || typeof changes !== 'object') return '';
        const entries = Object.entries(changes)
          .filter(([, change]) => change && typeof change === 'object' && ('from' in change || 'to' in change));
        if (entries.length === 0) return '';
        return entries
          .map(([field, change]) => `Changed ${prettifyFieldName(field)}: ${formatChangeValue(change.from)} -> ${formatChangeValue(change.to)}`)
          .join(' | ');
      };

      const buildUpdatedMessage = (entityLabel, fallbackLabel) => {
        const changesText = formatChangesList(body?.changes);
        if (changesText) return `${entityLabel} updated. ${changesText}`;
        return `Updated ${entityLabel.toLowerCase()} ${fallbackLabel || ''}`.trim();
      };

      const formatList = (values) => {
        if (!Array.isArray(values) || values.length === 0) return '';
        return values.filter(Boolean).join(', ');
      };

      // Semantic action names (controller-level) handled first
      switch (action) {
        case 'EventCopied':
          if (body) {
            const srcName = body.sourceEventName || body.sourceEventId || body.sourceEventID || '';
            const newName = body.newEventName || body.EventName || body.newEventId || body.newEventID || body.newEventId || '';
            if (srcName || newName) {
              message = `Copied event ${srcName} -> ${newName}`.trim();
            } else {
              message = detailsSummary || 'Event copied';
            }
          } else {
            message = detailsSummary || 'Event copied';
          }
          break;
        case 'EventAdded':
          message = `Created event ${body?.EventName || detailsSummary || ''}`.trim();
          break;
        case 'EventUpdated':
          message = buildUpdatedMessage(
            body?.EventName ? `Event ${body.EventName}` : 'Event',
            body?.EventID || body?.EventName || detailsSummary || ''
          );
          break;
        case 'EventDeleted':
          message = `Deleted events ${body?.deletedCount || detailsSummary || ''}`.trim();
          break;
        case 'AreaAdded':
          message = `Added area ${body?.AreaName || detailsSummary || ''}`.trim();
          break;
        case 'AreaDeleted':
          message = `Deleted areas ${body?.areaids || body?.areaIds || detailsSummary || ''}`.trim();
          break;
        case 'AreaUpdated':
          message = buildUpdatedMessage(
            body?.AreaName ? `Area ${body.AreaName}` : 'Area',
            body?.AreaID || body?.AreaName || detailsSummary || ''
          );
          break;
        case 'RequirementAdded':
          message = `Added requirement ${body?.RequirementCode || body?.RequirementID || detailsSummary || ''}`.trim();
          break;
        case 'RequirementUpdated':
          message = buildUpdatedMessage(
            body?.RequirementCode ? `Requirement ${body.RequirementCode}` : 'Requirement',
            body?.RequirementID || body?.RequirementCode || detailsSummary || ''
          );
          break;
        case 'RequirementFileUploaded': {
          const requirementLabel = body?.RequirementCode || body?.RequirementDescription || `Requirement #${body?.RequirementID || ''}`;
          const officeLabel = body?.OfficeName || 'Unknown office';
          const eventLabel = body?.EventName || 'Unknown event';
          const fileLabel = body?.FileName ? ` (${body.FileName})` : '';
          message = `Uploaded proof for ${requirementLabel} in office ${officeLabel} under event ${eventLabel}${fileLabel}.`;
          break;
        }
        case 'RequirementFileUnsubmitted': {
          const requirementLabel = body?.RequirementCode || body?.RequirementDescription || `Requirement #${body?.RequirementID || ''}`;
          const officeLabel = body?.OfficeName || 'Unknown office';
          const eventLabel = body?.EventName || 'Unknown event';
          const fileLabel = body?.FileName ? ` (${body.FileName})` : '';
          message = `Unsubmitted proof for ${requirementLabel} in office ${officeLabel} under event ${eventLabel}${fileLabel}.`;
          break;
        }
        case 'RequirementDeleted':
          message = `Deleted requirements ${body?.deletedCount || detailsSummary || ''}`.trim();
          break;
        case 'OfficeAdded': {
          const officeName = body?.OfficeName || 'Office';
          const officeType = body?.OfficeType ? ` (${body.OfficeType})` : '';
          const eventName = body?.EventName ? ` under ${body.EventName}` : '';
          const headNames = formatList(body?.HeadNames);
          message = `Created office ${officeName}${officeType}${eventName}.`;
          if (headNames) {
            message += ` Assigned head(s): ${headNames}.`;
          }
          break;
        }
        case 'OfficeUpdated': {
          const officeName = body?.OfficeName ? `Office ${body.OfficeName}` : 'Office';
          const changesText = formatChangesList(body?.changes);
          const addedHeads = formatList(body?.headChanges?.added);
          const removedHeads = formatList(body?.headChanges?.removed);

          const parts = [`${officeName} updated.`];
          if (changesText) parts.push(changesText);
          if (addedHeads) parts.push(`Added head(s): ${addedHeads}`);
          if (removedHeads) parts.push(`Removed head(s): ${removedHeads}`);
          message = parts.join(' ').trim();
          break;
        }
        case 'OfficeDeleted': {
          const officeName = body?.OfficeName || 'Office';
          const officeType = body?.OfficeType ? ` (${body.OfficeType})` : '';
          const eventName = body?.EventName ? ` from ${body.EventName}` : '';
          message = `Deleted office ${officeName}${officeType}${eventName}.`;
          break;
        }
        case 'OfficeHeadAdded': {
          const headNames = formatList(body?.HeadNames) || body?.HeadName || '';
          const position = body?.Position ? ` as ${body.Position}` : '';
          message = `Added office head${headNames ? `(s): ${headNames}` : ''}${position}.`.trim();
          break;
        }
        case 'OfficeHeadUpdated': {
          const headName = body?.HeadName || 'Office Personnel';
          const changesText = formatChangesList(body?.changes);
          message = changesText
            ? `Updated ${headName}. ${changesText}`
            : `Updated office personnel ${headName}`.trim();
          break;
        }
        case 'OfficeHeadDeleted': {
          const headNames = formatList(body?.HeadNames);
          if (headNames) {
            message = `Removed office head(s): ${headNames}.`;
          } else {
            message = `Removed ${body?.DeletedCount || 0} office head(s).`;
          }
          break;
        }
        case 'AuditorAssignedAreas': {
          const auditorName = body?.AuditorName || (body?.AuditorUserID ? `Auditor #${body.AuditorUserID}` : 'External Auditor');
          const count = body?.AssignedAreaCount ?? (Array.isArray(body?.Areas) ? body.Areas.length : 0);
          const areaNames = Array.isArray(body?.Areas)
            ? body.Areas.map(a => a.AreaCode ? (a.AreaName ? `${a.AreaCode} (${a.AreaName})` : a.AreaCode) : a.AreaName).filter(Boolean).join(', ')
            : '';
          if (count === 0) {
            message = `Updated assignments for ${auditorName} (cleared assigned areas).`;
          } else {
            message = `Assigned external auditor ${auditorName} to ${count} area(s): ${areaNames}.`;
          }
          break;
        }
        case 'CriteriaAdded':
          message = `Added criteria ${body?.CriteriaCode || body?.CriteriaID || detailsSummary || ''}`.trim();
          break;
        case 'CriteriaUpdated':
        case 'Criteria updated':
          message = buildUpdatedMessage(
            body?.CriteriaCode ? `Criteria ${body.CriteriaCode}` : 'Criteria',
            body?.CriteriaID || body?.CriteriaCode || detailsSummary || ''
          );
          break;
        case 'Criteria deleted':
          message = `Deleted criteria ${detailsSummary || ''}`.trim();
          break;
        case 'Login':
          message = `User logged in (${displayName || `#${row.UserID}`})`;
          break;
        case 'Logout':
          message = `User logged out (${displayName || `#${row.UserID}`})`;
          break;
        case 'UserRegistered':
          message = `New user registered (${body?.email || detailsSummary || ''})`;
          break;
        case 'UserApprovalUpdated':
          if (body?.changes) {
            message = buildUpdatedMessage(
              body?.userId ? `User ${body.userId}` : 'User',
              detailsSummary || ''
            );
          } else {
            message = (row.Details && String(row.Details).trim()) || `User ${body?.userId || ''} approval updated`.trim();
          }
          break;
        case 'UserRoleUpdated':
          if (body?.changes) {
            message = buildUpdatedMessage(
              body?.userId ? `User ${body.userId}` : 'User',
              detailsSummary || ''
            );
          } else {
            message = (row.Details && String(row.Details).trim()) || `User ${body?.userId || ''} role updated`.trim();
          }
          break;
        case 'UserUpdated':
          if (body?.changes) {
            message = buildUpdatedMessage(
              body?.userId ? `User ${body.userId}` : 'User',
              detailsSummary || ''
            );
          } else {
            message = (row.Details && String(row.Details).trim()) || 'User profile updated';
          }
          break;
        default:
          // If Action looks like HTTP middleware log e.g. "POST /api/events"
          const httpMatch = action.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)/i);
          if (httpMatch) {
            const verb = httpMatch[1].toUpperCase();
            const path = httpMatch[2];
            message = `${verb} ${path}${detailsSummary ? ` — ${detailsSummary}` : ''}`;
          } else {
            message = detailsSummary || action || 'Action performed';
          }
      }

      return {
        LogID: row.LogID,
        UserID: row.UserID,
        Action: stripEmojis(row.Action),
        Timestamp: row.Timestamp,
        Details: stripEmojis(row.Details),
        DetailsSummary: stripEmojis(detailsSummary),
        DetailsParsed: stripEmojis(detailsParsed),
        Message: stripEmojis(message),
        displayName: stripEmojis(displayName) || `Deleted user #${row.UserID}`,
        RoleName: stripEmojis(row.RoleName) || 'Deleted User',
        actorKind: stripEmojis(row.RoleName) || 'Deleted User',
      };
    });

    res.json({ success: true, logs, total: totalCount, totalPages, page, limit, stats });
  } catch (err) {
    console.error('getLogs:', err);
    res.status(500).json({ success: false, message: 'Failed to load activity logs' });
  }
};
