import type { MockConfig, StaticMockConfig } from '@baicie/faker-shared'

interface JsonRecord {
  [key: string]: unknown
}

interface SelectedResponse {
  response: JsonRecord
  status: number
}

const SUPPORTED_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
]

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(record: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseDocument(source: string): JsonRecord {
  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    throw new Error('OpenAPI import must be valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new Error('OpenAPI import must be a JSON object')
  }
  return parsed
}

function getDocumentVersion(document: JsonRecord): 'openapi' | 'swagger' {
  const openapi = readString(document.openapi)
  if (openapi && openapi.charAt(0) === '3') {
    return 'openapi'
  }

  if (document.swagger === '2.0') {
    return 'swagger'
  }

  throw new Error('OpenAPI import must be an OpenAPI 3 or Swagger 2 document')
}

function decodeReferenceToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

function resolveLocalReference(
  document: JsonRecord,
  reference: string,
  context: string,
): unknown {
  if (reference === '#') {
    return document
  }
  if (reference.slice(0, 2) !== '#/') {
    throw new Error(context + ' must use a local #/ reference')
  }

  const tokens = reference.slice(2).split('/')
  let current: unknown = document
  let index: number
  for (index = 0; index < tokens.length; index += 1) {
    if (!isRecord(current)) {
      throw new Error(context + ' cannot resolve local reference ' + reference)
    }
    const token = decodeReferenceToken(tokens[index])
    if (!hasOwn(current, token)) {
      throw new Error(context + ' cannot resolve local reference ' + reference)
    }
    current = current[token]
  }

  return current
}

function resolveRecord(
  value: unknown,
  document: JsonRecord,
  context: string,
): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(context + ' must be an object')
  }

  const reference = value.$ref
  if (reference === undefined) {
    return value
  }
  if (typeof reference !== 'string') {
    throw new Error(context + ' $ref must be a string')
  }

  const resolved = resolveLocalReference(document, reference, context)
  if (!isRecord(resolved)) {
    throw new Error(
      context + ' reference ' + reference + ' must resolve to an object',
    )
  }
  return resolved
}

function createSchemaExample(
  schema: unknown,
  document: JsonRecord,
  references: string[],
  context: string,
  depth: number,
): unknown {
  if (depth > 24) {
    throw new Error(context + ' exceeds the maximum schema reference depth')
  }

  if (!isRecord(schema)) {
    throw new Error(context + ' schema must be an object')
  }

  const reference = schema.$ref
  if (reference !== undefined) {
    if (typeof reference !== 'string') {
      throw new Error(context + ' schema $ref must be a string')
    }
    if (references.indexOf(reference) !== -1) {
      throw new Error(
        context + ' contains a circular schema reference ' + reference,
      )
    }
    const resolved = resolveLocalReference(document, reference, context)
    const nextReferences = references.concat(reference)
    return createSchemaExample(
      resolved,
      document,
      nextReferences,
      context,
      depth + 1,
    )
  }

  if (hasOwn(schema, 'example')) {
    return schema.example
  }
  if (hasOwn(schema, 'default')) {
    return schema.default
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0]
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return mergeSchemaExamples(
      schema.allOf,
      document,
      references,
      context,
      depth,
    )
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return createSchemaExample(
      schema.oneOf[0],
      document,
      references,
      context,
      depth + 1,
    )
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return createSchemaExample(
      schema.anyOf[0],
      document,
      references,
      context,
      depth + 1,
    )
  }

  if (schema.type === 'array') {
    return schema.items === undefined
      ? []
      : [
          createSchemaExample(
            schema.items,
            document,
            references,
            context,
            depth + 1,
          ),
        ]
  }

  if (schema.type === 'object' || isRecord(schema.properties)) {
    return createObjectExample(
      schema.properties,
      document,
      references,
      context,
      depth,
    )
  }
  if (schema.type === 'string') {
    return 'string'
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    return 0
  }
  if (schema.type === 'boolean') {
    return false
  }
  if (schema.type === 'null') {
    return null
  }

  return null
}

function createObjectExample(
  properties: unknown,
  document: JsonRecord,
  references: string[],
  context: string,
  depth: number,
): JsonRecord {
  const result: JsonRecord = {}
  if (!isRecord(properties)) {
    return result
  }

  Object.keys(properties).forEach(function (propertyName) {
    result[propertyName] = createSchemaExample(
      properties[propertyName],
      document,
      references,
      context + ' property ' + propertyName,
      depth + 1,
    )
  })
  return result
}

function mergeSchemaExamples(
  schemas: unknown[],
  document: JsonRecord,
  references: string[],
  context: string,
  depth: number,
): unknown {
  const merged: JsonRecord = {}
  let fallback: unknown = null
  let hasObject = false

  schemas.forEach(function (schema) {
    const example = createSchemaExample(
      schema,
      document,
      references,
      context,
      depth + 1,
    )
    if (isRecord(example)) {
      hasObject = true
      Object.keys(example).forEach(function (key) {
        merged[key] = example[key]
      })
    } else if (fallback === null) {
      fallback = example
    }
  })

  return hasObject ? merged : fallback
}

function selectResponse(
  responses: unknown,
  document: JsonRecord,
  context: string,
): SelectedResponse {
  const resolved = resolveRecord(responses, document, context + ' responses')
  const successKeys = Object.keys(resolved)
    .filter(function (key) {
      return /^2\d\d$/.test(key)
    })
    .sort()
  let responseKey = successKeys[0]
  if (!responseKey && hasOwn(resolved, '2XX')) {
    responseKey = '2XX'
  }
  if (!responseKey && hasOwn(resolved, 'default')) {
    responseKey = 'default'
  }

  if (!responseKey) {
    throw new Error(context + ' must define a 2xx or default response')
  }

  const parsedStatus = Number(responseKey)

  return {
    response: resolveRecord(
      resolved[responseKey],
      document,
      context + ' response ' + responseKey,
    ),
    status: isNaN(parsedStatus) ? 200 : parsedStatus,
  }
}

function selectJsonSchema(response: JsonRecord): unknown {
  if (isRecord(response.content)) {
    const mediaTypes = Object.keys(response.content)
    let mediaType: string | undefined
    if (hasOwn(response.content, 'application/json')) {
      mediaType = 'application/json'
    } else {
      mediaTypes.some(function (candidate) {
        if (/\+json(?:;|$)/i.test(candidate)) {
          mediaType = candidate
          return true
        }
        return false
      })
    }
    if (mediaType) {
      const media = response.content[mediaType]
      if (!isRecord(media)) {
        throw new Error('JSON response media type must be an object')
      }
      return media.schema
    }
  }

  return response.schema
}

function readTags(operation: JsonRecord, context: string): string[] {
  if (operation.tags === undefined) {
    return []
  }
  if (!Array.isArray(operation.tags)) {
    throw new Error(context + ' tags must be an array of strings')
  }

  const tags: string[] = []
  operation.tags.forEach(function (tag) {
    const value = readString(tag)
    if (!value) {
      throw new Error(context + ' tags must be an array of strings')
    }
    if (tags.indexOf(value) === -1) {
      tags.push(value)
    }
  })
  return tags
}

function getDocumentTitle(document: JsonRecord): string | undefined {
  return isRecord(document.info) ? readString(document.info.title) : undefined
}

function createMock(
  document: JsonRecord,
  version: 'openapi' | 'swagger',
  path: string,
  method: string,
  operationValue: unknown,
  title: string | undefined,
): StaticMockConfig<unknown> {
  const context = method.toUpperCase() + ' ' + path
  const operation = resolveRecord(operationValue, document, context)
  if (operation.responses === undefined) {
    throw new Error(context + ' must define responses')
  }

  const selected = selectResponse(operation.responses, document, context)
  const schema = selectJsonSchema(selected.response)
  const body =
    schema === undefined
      ? {}
      : createSchemaExample(schema, document, [], context + ' response', 0)
  const tags = readTags(operation, context)
  const summary = readString(operation.summary)
  const operationId = readString(operation.operationId)
  const description = readString(operation.description)
  const config: StaticMockConfig<unknown> = {
    url: path.replace(/\{([^}]+)\}/g, ':$1'),
    method: method.toUpperCase(),
    type: 'static',
    enabled: true,
    name: summary || operationId || context,
    group: tags[0] || title || (version === 'swagger' ? 'Swagger' : 'OpenAPI'),
    response: {
      status: selected.status,
      headers: { 'Content-Type': 'application/json' },
      body,
      delay: 0,
    },
  }

  if (description) {
    config.description = description
  }
  if (tags.length > 0) {
    config.tags = tags
  }

  return config
}

export function parseOpenApiImport(source: string): MockConfig[] {
  const document = parseDocument(source)
  const version = getDocumentVersion(document)
  const paths = document.paths
  if (!isRecord(paths)) {
    throw new Error('OpenAPI import must define a paths object')
  }

  const mocks: MockConfig[] = []
  const title = getDocumentTitle(document)
  Object.keys(paths).forEach(function (path) {
    if (path.charAt(0) !== '/') {
      throw new Error('OpenAPI path ' + path + ' must start with /')
    }
    const pathItem = resolveRecord(
      paths[path],
      document,
      'OpenAPI path ' + path,
    )
    SUPPORTED_METHODS.forEach(function (method) {
      if (pathItem[method] !== undefined) {
        mocks.push(
          createMock(document, version, path, method, pathItem[method], title),
        )
      }
    })
  })

  if (mocks.length === 0) {
    throw new Error('OpenAPI import contains no supported HTTP operations')
  }
  return mocks
}
