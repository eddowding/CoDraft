## Voting System Improvements (Medium-Low ROI)

### Medium Priority
- [ ] **Show Vote Weight Indicators** - Display verified vs unverified vote status in UI
- [ ] **Add Session Cleanup Job** - Create cron job to remove sessions older than 30 days
- [ ] **Simplify Vote Checking Logic** - Consolidate multiple queries into single efficient query
- [ ] **Add CSRF Protection** - Implement CSRF tokens for anonymous session creation
- [ ] **Rate Limiting** - Add rate limiting to prevent vote spam (max 10 votes/minute per session)

### Lower Priority (Nice to Have)
- [ ] **Vote History View** - Allow users to see their voting history across documents
- [ ] **Improved Modal UX** - Clarify difference between "Skip" and email-based voting
- [ ] **Loading States** - Add skeleton loaders during vote transitions
- [ ] **Verification Badge** - Show email verification status next to vote counts
- [ ] **Better Fingerprinting** - Research and implement more robust browser fingerprinting
- [ ] **Vote Analytics Dashboard** - Create admin dashboard for vote patterns and trends
- [ ] **Audit Trail** - Add vote_audit table to track all vote changes with timestamps

### Architecture Improvements (Long-term)
- [ ] **Extract Voting Service** - Create dedicated voting service/hook to decouple from UI
- [ ] **Separate Session Management** - Move session logic to separate context provider
- [ ] **Database Views** - Create materialized views for vote aggregation
- [ ] **Error Boundaries** - Implement proper error boundaries for voting components
- [ ] **Vote Weight Calculation** - Move vote weight logic to database functions
- [ ] **Connection Pooling** - Optimize database connections for high-traffic voting 