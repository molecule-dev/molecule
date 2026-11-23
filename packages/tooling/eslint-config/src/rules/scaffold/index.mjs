/**
 * The scaffold rules, one module each. A rule that parses the components a file imports
 * (through ./component-resolver.mjs) is a function of the parser it parses them with.
 *
 * @module
 */
import asyncCollectionsHaveStatus from './async-collections-have-status.mjs'
import buttonsHaveAnAction from './buttons-have-an-action.mjs'
import effectsPreserveFormEdits from './effects-preserve-form-edits.mjs'
import fetchHooksUseTheQueryCache from './fetch-hooks-use-the-query-cache.mjs'
import linksReachTheViewTheySelect from './links-reach-the-view-they-select.mjs'
import noBlockInParagraph from './no-block-in-paragraph.mjs'
import noFixedNavigationTruncation from './no-fixed-navigation-truncation.mjs'
import noInAppDocumentNavigation from './no-in-app-document-navigation.mjs'
import noUnansweredOptionalGuard from './no-unanswered-optional-guard.mjs'
import placeholdersStayOutOfRecordFields from './placeholders-stay-out-of-record-fields.mjs'
import preserveTimestampPrecision from './preserve-timestamp-precision.mjs'
import requireCatchBinding from './require-catch-binding.mjs'
import routerCommitsWithUrl from './router-commits-with-url.mjs'
import serverTogglesUseOptimisticValue from './server-toggles-use-optimistic-value.mjs'
import singleImageNameLink from './single-image-name-link.mjs'
import uniqueUpdateExcludesSelf from './unique-update-excludes-self.mjs'
import urlListsUseListRoute from './url-lists-use-list-route.mjs'
import urlSelectionsDeclareAccess from './url-selections-declare-access.mjs'

/** Shared scaffold diagnostics. ESLint supplies the parser used for imported source files. */
export function scaffoldRules(parser) {
  return {
    'no-in-app-document-navigation': noInAppDocumentNavigation,
    'single-image-name-link': singleImageNameLink,
    'url-selections-declare-access': urlSelectionsDeclareAccess(parser),
    'effects-preserve-form-edits': effectsPreserveFormEdits,
    'async-collections-have-status': asyncCollectionsHaveStatus(parser),
    'no-fixed-navigation-truncation': noFixedNavigationTruncation,
    'no-unanswered-optional-guard': noUnansweredOptionalGuard,
    'no-block-in-paragraph': noBlockInParagraph(parser),
    'unique-update-excludes-self': uniqueUpdateExcludesSelf,
    'router-commits-with-url': routerCommitsWithUrl,
    'url-lists-use-list-route': urlListsUseListRoute,
    'server-toggles-use-optimistic-value': serverTogglesUseOptimisticValue(parser),
    'buttons-have-an-action': buttonsHaveAnAction,
    'fetch-hooks-use-the-query-cache': fetchHooksUseTheQueryCache,
    'links-reach-the-view-they-select': linksReachTheViewTheySelect,
    'placeholders-stay-out-of-record-fields': placeholdersStayOutOfRecordFields(parser),
    'require-catch-binding': requireCatchBinding,
    'preserve-timestamp-precision': preserveTimestampPrecision,
  }
}
