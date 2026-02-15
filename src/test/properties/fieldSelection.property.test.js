/**
 * Property-Based Tests for Field Selection
 * Feature: e-commerce-platform-optimization
 * 
 * These tests verify field selection properties using fast-check for
 * property-based testing with 100+ iterations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { FieldSelector } from '../../utils/apiHelpers.js';

/**
 * Property 11: Field selection minimizes payload
 * **Validates: Requirements 4.3**
 * 
 * This property test verifies that when specific fields are requested via the API,
 * the response contains only those fields and the payload is minimized.
 */
describe('Feature: e-commerce-platform-optimization, Property 11: Field selection minimizes payload', () => {
  /**
   * Test that field selection returns only requested fields
   * This validates the core field selection property: when specific fields are requested,
   * the response should contain only those fields (no extra fields)
   */
  it('should return only requested fields when field selection is applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a product-like object with various fields
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 10, maxLength: 500 }),
          price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          category: fc.constantFrom('Electronics', 'Clothing', 'Books', 'Home', 'Sports'),
          images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          brand: fc.string({ minLength: 1, maxLength: 50 }),
          rating: fc.double({ min: 0, max: 5, noNaN: true }),
          reviewCount: fc.integer({ min: 0, max: 10000 }),
          isNew: fc.boolean(),
          isTrending: fc.boolean(),
          created_at: fc.date(),
          updated_at: fc.date(),
        }),
        // Generate a subset of fields to select (1-5 fields)
        fc.array(
          fc.constantFrom('id', 'name', 'price', 'category', 'images', 'stock', 'brand'),
          { minLength: 1, maxLength: 5 }
        ).map(fields => [...new Set(fields)]), // Remove duplicates
        async (product, requestedFields) => {
          // Apply field selection
          const result = FieldSelector.selectFields(product, requestedFields);

          // Property 1: Result should only contain requested fields
          const resultKeys = Object.keys(result);
          expect(resultKeys.length).toBeLessThanOrEqual(requestedFields.length);
          
          // Property 2: All returned keys should be in the requested fields
          for (const key of resultKeys) {
            expect(requestedFields).toContain(key);
          }

          // Property 3: All requested fields that exist in the source should be in the result
          for (const field of requestedFields) {
            if (product[field] !== undefined) {
              expect(result).toHaveProperty(field);
              expect(result[field]).toEqual(product[field]);
            }
          }

          // Property 4: Payload size should be smaller than original
          const originalSize = JSON.stringify(product).length;
          const resultSize = JSON.stringify(result).length;
          expect(resultSize).toBeLessThanOrEqual(originalSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that field selection works correctly with arrays of objects
   * This validates that field selection can be applied to multiple items consistently
   */
  it('should apply field selection consistently across array of objects', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of product-like objects
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            category: fc.constantFrom('Electronics', 'Clothing', 'Books'),
            stock: fc.integer({ min: 0, max: 1000 }),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            brand: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate fields to select
        fc.array(
          fc.constantFrom('id', 'name', 'price', 'category'),
          { minLength: 1, maxLength: 4 }
        ).map(fields => [...new Set(fields)]),
        async (products, requestedFields) => {
          // Apply field selection to array
          const results = FieldSelector.selectFieldsFromArray(products, requestedFields);

          // Property 1: Result array should have same length as input
          expect(results.length).toBe(products.length);

          // Property 2: Each item should only contain requested fields
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const original = products[i];
            const resultKeys = Object.keys(result);

            // All returned keys should be in requested fields
            for (const key of resultKeys) {
              expect(requestedFields).toContain(key);
            }

            // All requested fields that exist should be present
            for (const field of requestedFields) {
              if (original[field] !== undefined) {
                expect(result).toHaveProperty(field);
                expect(result[field]).toEqual(original[field]);
              }
            }
          }

          // Property 3: Total payload size should be smaller
          const originalSize = JSON.stringify(products).length;
          const resultSize = JSON.stringify(results).length;
          expect(resultSize).toBeLessThanOrEqual(originalSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that nested field selection works correctly
   * This validates that dot notation field selection extracts nested properties
   */
  it('should support nested field selection with dot notation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate object with nested structure
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          user: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            address: fc.record({
              city: fc.string({ minLength: 1, maxLength: 50 }),
              state: fc.string({ minLength: 2, maxLength: 2 }),
              zipcode: fc.string({ minLength: 5, maxLength: 10 }),
            }),
          }),
          price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
        }),
        // Generate nested field selections
        fc.array(
          fc.constantFrom('id', 'name', 'user.name', 'user.email', 'user.address.city', 'price'),
          { minLength: 1, maxLength: 4 }
        ).map(fields => [...new Set(fields)]),
        async (product, requestedFields) => {
          // Apply field selection
          const result = FieldSelector.selectFields(product, requestedFields);

          // Property 1: Check that nested fields are correctly extracted
          for (const field of requestedFields) {
            if (field.includes('.')) {
              const parts = field.split('.');
              const topLevel = parts[0];
              
              // Top level should exist in result
              expect(result).toHaveProperty(topLevel);
              
              // Verify nested value is correct
              const originalValue = FieldSelector.getNestedValue(product, field);
              const resultValue = FieldSelector.getNestedValue(result, field);
              
              if (originalValue !== undefined) {
                expect(resultValue).toEqual(originalValue);
              }
            } else {
              // Simple field
              if (product[field] !== undefined) {
                expect(result).toHaveProperty(field);
                expect(result[field]).toEqual(product[field]);
              }
            }
          }

          // Property 2: Result should not contain unrequested top-level fields
          const requestedTopLevel = new Set(
            requestedFields.map(f => f.split('.')[0])
          );
          const resultKeys = Object.keys(result);
          
          for (const key of resultKeys) {
            expect(requestedTopLevel.has(key)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that field selection handles edge cases correctly
   * This validates robustness: empty fields, null values, undefined fields
   */
  it('should handle edge cases gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate object with potential edge cases
        fc.record({
          id: fc.uuid(),
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          price: fc.option(fc.double({ min: 0.01, max: 10000, noNaN: true }), { nil: null }),
          description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          stock: fc.integer({ min: 0, max: 1000 }),
          tags: fc.option(fc.array(fc.string()), { nil: null }),
        }),
        fc.array(
          fc.constantFrom('id', 'name', 'price', 'description', 'stock', 'tags', 'nonexistent'),
          { minLength: 1, maxLength: 5 }
        ).map(fields => [...new Set(fields)]),
        async (product, requestedFields) => {
          // Apply field selection
          const result = FieldSelector.selectFields(product, requestedFields);

          // Property 1: Should not throw errors
          expect(result).toBeDefined();

          // Property 2: Should only include fields that exist in source
          for (const key of Object.keys(result)) {
            expect(product).toHaveProperty(key);
          }

          // Property 3: Should preserve null values (not filter them out)
          for (const field of requestedFields) {
            if (product[field] === null) {
              expect(result[field]).toBe(null);
            }
          }

          // Property 4: Should not include undefined fields
          for (const key of Object.keys(result)) {
            expect(product[key]).not.toBe(undefined);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that parseFields correctly handles various input formats
   * This validates the field parsing logic
   */
  it('should parse field parameter strings correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various field string formats
        fc.oneof(
          // Valid comma-separated fields
          fc.array(fc.constantFrom('id', 'name', 'price', 'category', 'stock'), { minLength: 1, maxLength: 5 })
            .map(fields => fields.join(',')),
          // Fields with spaces
          fc.array(fc.constantFrom('id', 'name', 'price'), { minLength: 1, maxLength: 3 })
            .map(fields => fields.join(', ')),
          // Empty string
          fc.constant(''),
          // Null/undefined
          fc.constant(null),
        ),
        async (fieldsParam) => {
          // Parse fields
          const parsed = FieldSelector.parseFields(fieldsParam);

          if (fieldsParam === null || fieldsParam === '' || fieldsParam === undefined) {
            // Property 1: Invalid input should return null
            expect(parsed).toBe(null);
          } else if (typeof fieldsParam === 'string' && fieldsParam.trim().length > 0) {
            // Property 2: Valid input should return array
            expect(Array.isArray(parsed)).toBe(true);
            
            // Property 3: Array should contain trimmed field names
            for (const field of parsed) {
              expect(field.trim()).toBe(field);
              expect(field.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that field selection provides measurable payload reduction
   * This validates the performance benefit of field selection
   */
  it('should reduce payload size when selecting subset of fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a large product object
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 50, maxLength: 200 }),
          description: fc.string({ minLength: 200, maxLength: 1000 }),
          longDescription: fc.string({ minLength: 500, maxLength: 2000 }),
          price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          category: fc.string({ minLength: 10, maxLength: 50 }),
          images: fc.array(fc.webUrl(), { minLength: 5, maxLength: 10 }),
          specifications: fc.record({
            weight: fc.double({ min: 0.1, max: 100, noNaN: true }),
            dimensions: fc.string({ minLength: 10, maxLength: 50 }),
            material: fc.string({ minLength: 10, maxLength: 100 }),
            warranty: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          reviews: fc.array(
            fc.record({
              rating: fc.integer({ min: 1, max: 5 }),
              comment: fc.string({ minLength: 50, maxLength: 200 }),
            }),
            { minLength: 5, maxLength: 20 }
          ),
        }),
        async (product) => {
          // Select only a small subset of fields
          const minimalFields = ['id', 'name', 'price'];
          const result = FieldSelector.selectFields(product, minimalFields);

          // Property 1: Minimal selection should significantly reduce payload
          const originalSize = JSON.stringify(product).length;
          const resultSize = JSON.stringify(result).length;
          
          // Should be at least 50% smaller for this test case
          const reductionPercentage = ((originalSize - resultSize) / originalSize) * 100;
          expect(reductionPercentage).toBeGreaterThan(50);

          // Property 2: Result should still contain all requested fields
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('price');
          expect(Object.keys(result).length).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
