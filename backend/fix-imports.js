const fs = require('fs');
const path = require('path');

// Define file replacements
const replacements = [
  // Fix model imports - replace individual imports with index imports
  {
    pattern: /import { (\w+) } from '@\/models\/\w+';/g,
    replacement: (match, modelName) => `import { ${modelName} } from '@/models';`
  },
  {
    pattern: /import { (\w+), (\w+) } from '@\/models\/\w+';/g,
    replacement: (match, model1, model2) => `import { ${model1}, ${model2} } from '@/models';`
  },
  {
    pattern: /import { (\w+), (\w+), (\w+) } from '@\/models\/\w+';/g,
    replacement: (match, model1, model2, model3) => `import { ${model1}, ${model2}, ${model3} } from '@/models';`
  },
  // Multiple individual model imports - combine them
  {
    pattern: /import { User } from '@\/models\/User';\nimport { Service } from '@\/models\/Service';\nimport { ServiceProvider } from '@\/models\/ServiceProvider';\nimport { Booking } from '@\/models\/Booking';\nimport { Review } from '@\/models\/Review';/g,
    replacement: `import { User, Service, ServiceProvider, Booking, Review } from '@/models';`
  },
  {
    pattern: /import { User } from '@\/models\/User';\nimport { Service } from '@\/models\/Service';\nimport { ServiceProvider } from '@\/models\/ServiceProvider';/g,
    replacement: `import { User, Service, ServiceProvider } from '@/models';`
  },
  {
    pattern: /import { Review } from '@\/models\/Review';\nimport { Booking } from '@\/models\/Booking';\nimport { User } from '@\/models\/User';\nimport { Service } from '@\/models\/Service';\nimport { ServiceProvider } from '@\/models\/ServiceProvider';/g,
    replacement: `import { User, Service, ServiceProvider, Booking, Review } from '@/models';`
  },
  {
    pattern: /import { Notification } from '@\/models\/Notification';/g,
    replacement: `import { Notification } from '@/models';`
  },
  // Fix EmailService import
  {
    pattern: /import { EmailService } from '@\/services\/email\.service';\n\nconst emailService = new EmailService\(\);/g,
    replacement: `import { emailService } from '@/services/email.service';`
  },
  {
    pattern: /import { EmailService } from '\.\/email\.service';\n\nconst emailService = new EmailService\(\);/g,
    replacement: `import { emailService } from './email.service';`
  },
  {
    pattern: /import { EmailService } from '\.\/email\.service';/g,
    replacement: `import { emailService } from './email.service';`
  },
  // Fix route imports
  {
    pattern: /getProviders/g,
    replacement: `getAllProviders`
  },
  {
    pattern: /updateProviderAvailability/g,
    replacement: `updateAvailability`
  }
];

// List of files to process
const filesToProcess = [
  'src/controllers/admin.controller.ts',
  'src/controllers/booking.controller.ts',
  'src/controllers/payment.controller.ts',
  'src/controllers/provider.controller.ts',
  'src/controllers/review.controller.ts',
  'src/controllers/service.controller.ts',
  'src/controllers/user.controller.ts',
  'src/services/notification.service.ts',
  'src/services/search.service.ts',
  'src/scripts/seed.ts',
  'src/routes/provider.routes.ts',
  'src/routes/payment.routes.ts'
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply all replacements
  for (const replacement of replacements) {
    if (replacement.pattern.global) {
      const newContent = content.replace(replacement.pattern, replacement.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    } else {
      if (typeof replacement.replacement === 'function') {
        const newContent = content.replace(replacement.pattern, replacement.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      } else {
        const newContent = content.replace(replacement.pattern, replacement.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

console.log('Fixing import issues...');

// Process all files
for (const file of filesToProcess) {
  processFile(file);
}

console.log('Import fixes completed!');
