#!/bin/bash

# scripts/regenerate-prisma-client.sh
# This script regenerates the Prisma client after schema changes

echo "=== Regenerating Prisma Client ==="

# Navigate to the project directory
cd /var/www/portavi

# Regenerate the Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client regenerated successfully"
    
    # Test the client quickly
    echo "🔍 Testing the updated client..."
    node -e "
        const { PrismaClient } = require('./prisma/app/generated/prisma/client');
        const prisma = new PrismaClient();
        
        async function test() {
            try {
                const connection = await prisma.aDOConnection.findFirst();
                console.log('✅ Client test successful');
                console.log('   PAT field accessible:', !!connection.personalAccessToken);
                console.log('   PAT length:', connection.personalAccessToken ? connection.personalAccessToken.length : 0);
                await prisma.\$disconnect();
            } catch (error) {
                console.log('❌ Client test failed:', error.message);
                await prisma.\$disconnect();
                process.exit(1);
            }
        }
        
        test();
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ All tests passed! The PersonalAccessToken field is now accessible."
        echo ""
        echo "🎯 Next steps:"
        echo "   1. The AI job processor should now be able to access the PAT"
        echo "   2. You can restart the AI job processor service if needed"
        echo "   3. Run a test job to verify Azure DevOps connectivity"
    else
        echo "❌ Client test failed after regeneration"
    fi
else
    echo "❌ Failed to regenerate Prisma client"
    exit 1
fi
