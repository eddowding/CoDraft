#!/usr/bin/env node

/**
 * CoDraft PostgreSQL to Supabase Migration Script
 *
 * This script migrates data from the existing PostgreSQL database
 * to Supabase while preserving all relationships and data integrity.
 */

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const config = {
  // Existing PostgreSQL connection
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'codraft',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // Supabase connection
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role key required
  },

  // Migration options
  batchSize: 100,
  dryRun: process.env.DRY_RUN === 'true',
  skipAuth: process.env.SKIP_AUTH === 'true',
}

// Initialize connections
const pgClient = new pg.Client(config.postgres)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// UUID mapping for ID migration
const idMappings = {
  users: new Map(),
  documents: new Map(),
  elements: new Map(),
  comments: new Map(),
  votes: new Map(),
  versions: new Map(),
  views: new Map(),
}

// Migration statistics
const stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  documents: { total: 0, migrated: 0, errors: 0 },
  elements: { total: 0, migrated: 0, errors: 0 },
  comments: { total: 0, migrated: 0, errors: 0 },
  votes: { total: 0, migrated: 0, errors: 0 },
  versions: { total: 0, migrated: 0, errors: 0 },
  views: { total: 0, migrated: 0, errors: 0 },
}

// Utility functions
const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString()
  const prefix = config.dryRun ? '[DRY RUN] ' : ''
  console.log(`${timestamp} [${level.toUpperCase()}] ${prefix}${message}`)
}

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100)
}

// Migration functions
async function migrateUsers() {
  log('Starting user migration...')

  try {
    const { rows: users } = await pgClient.query(`
      SELECT id, username, password, email, is_email_verified, created_at
      FROM users
      ORDER BY id
    `)

    stats.users.total = users.length
    log(`Found ${users.length} users to migrate`)

    for (let i = 0; i < users.length; i += config.batchSize) {
      const batch = users.slice(i, i + config.batchSize)
      await processBatch(batch, migrateUserBatch, 'users')
    }

    log(`User migration completed. Migrated: ${stats.users.migrated}, Errors: ${stats.users.errors}`)
  } catch (error) {
    log(`Error migrating users: ${error.message}`, 'error')
    throw error
  }
}

async function migrateUserBatch(users) {
  const authUsers = []
  const profiles = []

  for (const user of users) {
    try {
      const newUserId = uuidv4()
      idMappings.users.set(user.id, newUserId)

      // Create auth user
      if (!config.skipAuth && !config.dryRun) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'TempPassword123!', // Users will need to reset
          email_confirm: user.is_email_verified,
          user_metadata: {
            username: user.username,
            migrated_from_id: user.id,
            migration_date: new Date().toISOString()
          }
        })

        if (authError) {
          log(`Error creating auth user for ${user.email}: ${authError.message}`, 'error')
          stats.users.errors++
          continue
        }

        // Use the actual user ID from Supabase Auth
        idMappings.users.set(user.id, authUser.user.id)
      }

      // Prepare profile data
      profiles.push({
        id: idMappings.users.get(user.id),
        username: user.username,
        email_notifications: true,
        browser_notifications: false,
        theme: 'system',
        is_email_verified: user.is_email_verified,
        created_at: user.created_at,
        updated_at: user.created_at
      })

      stats.users.migrated++

    } catch (error) {
      log(`Error migrating user ${user.username}: ${error.message}`, 'error')
      stats.users.errors++
    }
  }

  // Insert profiles in batch
  if (profiles.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('user_profiles')
      .insert(profiles)

    if (error) {
      log(`Error inserting user profiles batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateDocuments() {
  log('Starting document migration...')

  try {
    const { rows: documents } = await pgClient.query(`
      SELECT id, title, content, author_id, is_public, created_at, slug, summary
      FROM documents
      ORDER BY id
    `)

    stats.documents.total = documents.length
    log(`Found ${documents.length} documents to migrate`)

    for (let i = 0; i < documents.length; i += config.batchSize) {
      const batch = documents.slice(i, i + config.batchSize)
      await processBatch(batch, migrateDocumentBatch, 'documents')
    }

    log(`Document migration completed. Migrated: ${stats.documents.migrated}, Errors: ${stats.documents.errors}`)
  } catch (error) {
    log(`Error migrating documents: ${error.message}`, 'error')
    throw error
  }
}

async function migrateDocumentBatch(documents) {
  const documentData = documents.map(doc => {
    const newDocId = uuidv4()
    idMappings.documents.set(doc.id, newDocId)

    const authorId = idMappings.users.get(doc.author_id)
    if (!authorId) {
      log(`Warning: Author ID ${doc.author_id} not found for document ${doc.title}`, 'warn')
      stats.documents.errors++
      return null
    }

    stats.documents.migrated++

    return {
      id: newDocId,
      title: doc.title,
      content: doc.content || '',
      summary: doc.summary,
      slug: doc.slug || generateSlug(doc.title),
      author_id: authorId,
      is_public: doc.is_public,
      is_collaborative: false,
      status: 'published',
      word_count: 0, // Will be updated by triggers
      estimated_read_time: 0, // Will be updated by triggers
      created_at: doc.created_at,
      updated_at: doc.created_at
    }
  }).filter(doc => doc !== null)

  if (documentData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('documents')
      .insert(documentData)

    if (error) {
      log(`Error inserting documents batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateElements() {
  log('Starting element migration...')

  try {
    const { rows: elements } = await pgClient.query(`
      SELECT id, document_id, content, type, "order",
             upvote_count, downvote_count, total_vote_count,
             vote_score, last_vote_sync, created_at
      FROM elements
      ORDER BY document_id, "order"
    `)

    stats.elements.total = elements.length
    log(`Found ${elements.length} elements to migrate`)

    for (let i = 0; i < elements.length; i += config.batchSize) {
      const batch = elements.slice(i, i + config.batchSize)
      await processBatch(batch, migrateElementBatch, 'elements')
    }

    log(`Element migration completed. Migrated: ${stats.elements.migrated}, Errors: ${stats.elements.errors}`)
  } catch (error) {
    log(`Error migrating elements: ${error.message}`, 'error')
    throw error
  }
}

async function migrateElementBatch(elements) {
  const elementData = elements.map(element => {
    const newElementId = uuidv4()
    idMappings.elements.set(element.id, newElementId)

    const documentId = idMappings.documents.get(element.document_id)
    if (!documentId) {
      log(`Warning: Document ID ${element.document_id} not found for element ${element.id}`, 'warn')
      stats.elements.errors++
      return null
    }

    stats.elements.migrated++

    return {
      id: newElementId,
      document_id: documentId,
      content: element.content,
      type: element.type,
      order_index: element.order,
      upvote_count: element.upvote_count || 0,
      downvote_count: element.downvote_count || 0,
      total_vote_count: element.total_vote_count || 0,
      vote_score: element.vote_score || 0,
      last_vote_sync: element.last_vote_sync || element.created_at,
      version: 1,
      created_at: element.created_at,
      updated_at: element.created_at
    }
  }).filter(element => element !== null)

  if (elementData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('elements')
      .insert(elementData)

    if (error) {
      log(`Error inserting elements batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateComments() {
  log('Starting comment migration...')

  try {
    const { rows: comments } = await pgClient.query(`
      SELECT id, element_id, user_id, content, created_at
      FROM comments
      ORDER BY id
    `)

    stats.comments.total = comments.length
    log(`Found ${comments.length} comments to migrate`)

    for (let i = 0; i < comments.length; i += config.batchSize) {
      const batch = comments.slice(i, i + config.batchSize)
      await processBatch(batch, migrateCommentBatch, 'comments')
    }

    log(`Comment migration completed. Migrated: ${stats.comments.migrated}, Errors: ${stats.comments.errors}`)
  } catch (error) {
    log(`Error migrating comments: ${error.message}`, 'error')
    throw error
  }
}

async function migrateCommentBatch(comments) {
  const commentData = comments.map(comment => {
    const newCommentId = uuidv4()
    idMappings.comments.set(comment.id, newCommentId)

    const elementId = idMappings.elements.get(comment.element_id)
    const userId = idMappings.users.get(comment.user_id)

    if (!elementId || !userId) {
      log(`Warning: Missing references for comment ${comment.id}`, 'warn')
      stats.comments.errors++
      return null
    }

    stats.comments.migrated++

    return {
      id: newCommentId,
      element_id: elementId,
      user_id: userId,
      content: comment.content,
      is_resolved: false,
      is_deleted: false,
      created_at: comment.created_at,
      updated_at: comment.created_at
    }
  }).filter(comment => comment !== null)

  if (commentData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('comments')
      .insert(commentData)

    if (error) {
      log(`Error inserting comments batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateVotes() {
  log('Starting vote migration...')

  try {
    const { rows: votes } = await pgClient.query(`
      SELECT id, element_id, user_id, value
      FROM votes
      ORDER BY id
    `)

    stats.votes.total = votes.length
    log(`Found ${votes.length} votes to migrate`)

    for (let i = 0; i < votes.length; i += config.batchSize) {
      const batch = votes.slice(i, i + config.batchSize)
      await processBatch(batch, migrateVoteBatch, 'votes')
    }

    log(`Vote migration completed. Migrated: ${stats.votes.migrated}, Errors: ${stats.votes.errors}`)
  } catch (error) {
    log(`Error migrating votes: ${error.message}`, 'error')
    throw error
  }
}

async function migrateVoteBatch(votes) {
  const voteData = votes.map(vote => {
    const newVoteId = uuidv4()
    idMappings.votes.set(vote.id, newVoteId)

    const elementId = idMappings.elements.get(vote.element_id)
    const userId = idMappings.users.get(vote.user_id)

    if (!elementId || !userId) {
      log(`Warning: Missing references for vote ${vote.id}`, 'warn')
      stats.votes.errors++
      return null
    }

    stats.votes.migrated++

    return {
      id: newVoteId,
      element_id: elementId,
      user_id: userId,
      value: vote.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }).filter(vote => vote !== null)

  if (voteData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('votes')
      .insert(voteData)

    if (error) {
      log(`Error inserting votes batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateVersions() {
  log('Starting version migration...')

  try {
    const { rows: versions } = await pgClient.query(`
      SELECT id, element_id, user_id, content, created_at
      FROM versions
      ORDER BY element_id, created_at
    `)

    stats.versions.total = versions.length
    log(`Found ${versions.length} versions to migrate`)

    for (let i = 0; i < versions.length; i += config.batchSize) {
      const batch = versions.slice(i, i + config.batchSize)
      await processBatch(batch, migrateVersionBatch, 'versions')
    }

    log(`Version migration completed. Migrated: ${stats.versions.migrated}, Errors: ${stats.versions.errors}`)
  } catch (error) {
    log(`Error migrating versions: ${error.message}`, 'error')
    throw error
  }
}

async function migrateVersionBatch(versions) {
  const versionData = versions.map((version, index) => {
    const newVersionId = uuidv4()
    idMappings.versions.set(version.id, newVersionId)

    const elementId = idMappings.elements.get(version.element_id)
    const userId = idMappings.users.get(version.user_id)

    if (!elementId || !userId) {
      log(`Warning: Missing references for version ${version.id}`, 'warn')
      stats.versions.errors++
      return null
    }

    stats.versions.migrated++

    return {
      id: newVersionId,
      element_id: elementId,
      user_id: userId,
      content: version.content,
      version_number: index + 1, // Sequential numbering
      change_summary: 'Migrated from legacy system',
      is_major_change: false,
      created_at: version.created_at
    }
  }).filter(version => version !== null)

  if (versionData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('versions')
      .insert(versionData)

    if (error) {
      log(`Error inserting versions batch: ${error.message}`, 'error')
      throw error
    }
  }
}

async function migrateViews() {
  log('Starting view migration...')

  try {
    const { rows: views } = await pgClient.query(`
      SELECT id, element_id, user_id, created_at
      FROM views
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `)

    stats.views.total = views.length
    log(`Found ${views.length} recent views to migrate`)

    for (let i = 0; i < views.length; i += config.batchSize) {
      const batch = views.slice(i, i + config.batchSize)
      await processBatch(batch, migrateViewBatch, 'views')
    }

    log(`View migration completed. Migrated: ${stats.views.migrated}, Errors: ${stats.views.errors}`)
  } catch (error) {
    log(`Error migrating views: ${error.message}`, 'error')
    throw error
  }
}

async function migrateViewBatch(views) {
  const viewData = views.map(view => {
    const newViewId = uuidv4()
    idMappings.views.set(view.id, newViewId)

    const elementId = idMappings.elements.get(view.element_id)
    const userId = view.user_id ? idMappings.users.get(view.user_id) : null

    if (!elementId) {
      log(`Warning: Element ID ${view.element_id} not found for view ${view.id}`, 'warn')
      stats.views.errors++
      return null
    }

    stats.views.migrated++

    return {
      id: newViewId,
      element_id: elementId,
      user_id: userId,
      session_id: `migrated_${view.id}`,
      created_at: view.created_at
    }
  }).filter(view => view !== null)

  if (viewData.length > 0 && !config.dryRun) {
    const { error } = await supabase
      .from('views')
      .insert(viewData)

    if (error) {
      log(`Error inserting views batch: ${error.message}`, 'error')
      throw error
    }
  }
}

// Utility function to process batches
async function processBatch(batch, migrationFunction, entityType) {
  try {
    await migrationFunction(batch)
    log(`Processed batch of ${batch.length} ${entityType}`)
  } catch (error) {
    log(`Error processing ${entityType} batch: ${error.message}`, 'error')
    stats[entityType].errors += batch.length
  }
}

// Validation functions
async function validateMigration() {
  log('Validating migration...')

  const validationResults = {}

  for (const [table, tableStats] of Object.entries(stats)) {
    const { data, error } = await supabase
      .from(table === 'users' ? 'user_profiles' : table)
      .select('id', { count: 'exact', head: true })

    if (error) {
      log(`Error validating ${table}: ${error.message}`, 'error')
      validationResults[table] = { valid: false, error: error.message }
    } else {
      const expectedCount = tableStats.migrated
      const actualCount = data.length || 0

      validationResults[table] = {
        valid: actualCount >= expectedCount,
        expected: expectedCount,
        actual: actualCount,
        difference: actualCount - expectedCount
      }
    }
  }

  // Print validation results
  log('Migration validation results:')
  for (const [table, result] of Object.entries(validationResults)) {
    if (result.valid) {
      log(`✅ ${table}: ${result.actual}/${result.expected} records`)
    } else {
      log(`❌ ${table}: ${result.actual}/${result.expected} records (${result.error || 'count mismatch'})`, 'error')
    }
  }

  return validationResults
}

// Export ID mappings for reference
async function exportIdMappings() {
  const mappingsData = {}

  for (const [table, mapping] of Object.entries(idMappings)) {
    mappingsData[table] = Array.from(mapping.entries()).map(([oldId, newId]) => ({
      old_id: oldId,
      new_id: newId
    }))
  }

  // Save to file
  const fs = await import('fs')
  const mappingsFile = `migration_id_mappings_${Date.now()}.json`
  fs.writeFileSync(mappingsFile, JSON.stringify(mappingsData, null, 2))
  log(`ID mappings exported to ${mappingsFile}`)
}

// Main migration function
async function runMigration() {
  const startTime = Date.now()

  try {
    log('Starting CoDraft migration to Supabase...')

    if (config.dryRun) {
      log('Running in DRY RUN mode - no data will be modified')
    }

    // Connect to databases
    await pgClient.connect()
    log('Connected to PostgreSQL database')

    // Test Supabase connection
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1)
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      throw new Error(`Supabase connection failed: ${error.message}`)
    }
    log('Connected to Supabase database')

    // Run migrations in order (maintaining referential integrity)
    await migrateUsers()
    await migrateDocuments()
    await migrateElements()
    await migrateComments()
    await migrateVotes()
    await migrateVersions()
    await migrateViews()

    // Validate migration
    await validateMigration()

    // Export ID mappings
    await exportIdMappings()

    const duration = (Date.now() - startTime) / 1000
    log(`Migration completed in ${duration} seconds`)

    // Print final statistics
    log('Final migration statistics:')
    for (const [table, tableStats] of Object.entries(stats)) {
      log(`  ${table}: ${tableStats.migrated}/${tableStats.total} migrated, ${tableStats.errors} errors`)
    }

  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error')
    process.exit(1)
  } finally {
    await pgClient.end()
    log('Migration script completed')
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export { runMigration, validateMigration }